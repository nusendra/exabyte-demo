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
