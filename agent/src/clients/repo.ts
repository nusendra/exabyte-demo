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
