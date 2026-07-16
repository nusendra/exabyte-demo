import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import { config, webDir } from '../config.js';
import type { FileChange } from '../state.js';

const git = (args: string[]) => execa('git', args, { cwd: config.repoDir });

/** Create and check out a fresh branch off the latest base branch. */
export async function createBranch(name: string): Promise<void> {
  await git(['checkout', config.baseBranch]);
  // Best-effort: pull merged work so each task branches off up-to-date main.
  await git(['pull', '--ff-only']).catch(() => {});
  await git(['checkout', '-B', name]);
}

/** Write a set of full-file changes to disk (repo-relative paths). */
export async function writeFiles(changes: FileChange[]): Promise<string[]> {
  const written: string[] = [];
  for (const change of changes) {
    const abs = path.join(config.repoDir, change.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, change.content, 'utf8');
    written.push(change.path);
  }
  return written;
}

/** Read a repo-relative file, or '' if it does not exist. */
export async function readFile(relPath: string): Promise<string> {
  try {
    return await fs.readFile(path.join(config.repoDir, relPath), 'utf8');
  } catch {
    return '';
  }
}

/** Run the web app's vitest suite. Returns pass flag + combined output. */
export async function runWebTests(): Promise<{ passed: boolean; output: string }> {
  try {
    const res = await execa('npm', ['run', 'test'], { cwd: webDir, reject: false });
    const output = `${res.stdout}\n${res.stderr}`.trim();
    return { passed: res.exitCode === 0, output };
  } catch (err) {
    return { passed: false, output: String(err) };
  }
}

/** Run the production build. A PR must never open on a change that fails to build. */
export async function runWebBuild(): Promise<{ passed: boolean; output: string }> {
  try {
    const res = await execa('npm', ['run', 'build'], { cwd: webDir, reject: false });
    const output = `${res.stdout}\n${res.stderr}`.trim();
    return { passed: res.exitCode === 0, output };
  } catch (err) {
    return { passed: false, output: String(err) };
  }
}

/** Stage everything, commit, and push the branch. */
export async function commitAndPush(branch: string, message: string): Promise<void> {
  await git(['add', '-A']);
  await git(['commit', '-m', message]);
  await git(['push', '-u', 'origin', branch]);
}

/** Open a PR with the GitHub CLI and return its URL. */
export async function openPR(title: string, body: string): Promise<string> {
  const res = await execa(
    'gh',
    ['pr', 'create', '--base', config.baseBranch, '--title', title, '--body', body],
    { cwd: config.repoDir }
  );
  return res.stdout.trim();
}

const gh = (args: string[]) => execa('gh', args, { cwd: config.repoDir });

/** Basic PR metadata. */
export async function getPR(pr: string): Promise<{ headRefName: string; title: string }> {
  const res = await gh(['pr', 'view', pr, '--json', 'headRefName,title']);
  return JSON.parse(res.stdout);
}

/** Repo-relative paths of files the PR changed. */
export async function getPRFiles(pr: string): Promise<string[]> {
  const res = await gh(['pr', 'view', pr, '--json', 'files']);
  const data = JSON.parse(res.stdout) as { files: { path: string }[] };
  return data.files.map((f) => f.path);
}

/** Collect review bodies, top-level comments, and inline review comments as one string. */
export async function getReviewFeedback(pr: string): Promise<string> {
  const res = await gh(['pr', 'view', pr, '--json', 'comments,reviews']);
  const data = JSON.parse(res.stdout) as {
    comments: { body: string }[];
    reviews: { body: string; state: string }[];
  };
  const parts: string[] = [];
  for (const r of data.reviews) {
    if (r.body?.trim()) parts.push(`[review ${r.state}] ${r.body.trim()}`);
  }
  for (const c of data.comments) {
    if (c.body?.trim()) parts.push(`[comment] ${c.body.trim()}`);
  }
  // Inline review comments (tied to a file/line).
  try {
    const inline = await gh([
      'api',
      `repos/{owner}/{repo}/pulls/${pr}/comments`,
      '--jq',
      '.[] | "[inline " + .path + ":" + (.line // 0 | tostring) + "] " + .body'
    ]);
    if (inline.stdout.trim()) parts.push(inline.stdout.trim());
  } catch {
    // no inline comments / older gh — ignore
  }
  return parts.join('\n');
}

/** Fetch and check out an existing branch, pulling latest. */
export async function checkoutBranch(name: string): Promise<void> {
  await git(['fetch', 'origin', name]);
  await git(['checkout', name]);
  await git(['pull', '--ff-only']).catch(() => {});
}

/** Post a comment on a PR. */
export async function commentPR(pr: string, body: string): Promise<void> {
  await gh(['pr', 'comment', pr, '--body', body]);
}

/** Open PRs that came from an agent branch. */
export async function listOpenAgentPRs(): Promise<{ number: number; branch: string }[]> {
  const res = await gh(['pr', 'list', '--state', 'open', '--json', 'number,headRefName']);
  const data = JSON.parse(res.stdout) as { number: number; headRefName: string }[];
  return data
    .filter((p) => p.headRefName.startsWith('agent/task-'))
    .map((p) => ({ number: p.number, branch: p.headRefName }));
}

// Comment authors whose messages should never trigger a revision.
const IGNORED_AUTHORS = new Set(['netlify', 'github-actions', 'dependabot']);

function isHumanFeedback(login: string | undefined, body: string | undefined): boolean {
  const name = (login ?? '').toLowerCase();
  if (IGNORED_AUTHORS.has(name) || name.endsWith('[bot]')) return false;
  // The agent's own PR comments start with the robot emoji — don't loop on them.
  if ((body ?? '').trimStart().startsWith('🤖')) return false;
  return true;
}

/**
 * Timestamps (ms) of the newest human feedback (review OR plain comment) and
 * newest commit on a PR. Feedback newer than the last commit triggers a revise.
 */
export async function getPRActivity(
  pr: string
): Promise<{ lastFeedback: number | null; lastCommit: number | null }> {
  const res = await gh(['pr', 'view', pr, '--json', 'reviews,comments,commits']);
  const data = JSON.parse(res.stdout) as {
    reviews: { submittedAt?: string; body?: string; author?: { login?: string } }[];
    comments: { createdAt?: string; body?: string; author?: { login?: string } }[];
    commits: { committedDate?: string }[];
  };

  const feedbackTimes: number[] = [];
  for (const r of data.reviews) {
    if (r.submittedAt && isHumanFeedback(r.author?.login, r.body)) {
      feedbackTimes.push(Date.parse(r.submittedAt));
    }
  }
  for (const c of data.comments) {
    if (c.createdAt && isHumanFeedback(c.author?.login, c.body)) {
      feedbackTimes.push(Date.parse(c.createdAt));
    }
  }
  const commitTimes = data.commits
    .map((c) => c.committedDate)
    .filter((s): s is string => !!s)
    .map((s) => Date.parse(s));

  return {
    lastFeedback: feedbackTimes.length ? Math.max(...feedbackTimes) : null,
    lastCommit: commitTimes.length ? Math.max(...commitTimes) : null
  };
}
