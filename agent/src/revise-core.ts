import { config } from './config.js';
import * as clickup from './clients/clickup.js';
import {
  checkoutBranch,
  commentPR,
  commitAndPush,
  getPR,
  getPRFiles,
  getReviewFeedback,
  readFile,
  runWebBuild,
  runWebTests,
  writeFiles
} from './clients/repo.js';
import * as llm from './llm.js';
import type { FileChange } from './state.js';

export type ReviseResult = 'revised' | 'nofeedback' | 'failed';

async function verify(): Promise<{ passed: boolean; output: string }> {
  const test = await runWebTests();
  if (!test.passed) return { passed: false, output: test.output };
  const build = await runWebBuild();
  if (!build.passed) {
    return { passed: false, output: `Tests pass but BUILD FAILED:\n${build.output}` };
  }
  return { passed: true, output: test.output };
}

/**
 * Apply a PR's review feedback to its branch, keeping tests + build green,
 * and push. Returns what happened.
 */
export async function revisePR(pr: string, knownBranch?: string): Promise<ReviseResult> {
  const meta = knownBranch ? { headRefName: knownBranch, title: `PR #${pr}` } : await getPR(pr);
  const branch = meta.headRefName;
  console.log(`\n🔁 revising PR #${pr} on branch ${branch}`);

  const feedback = await getReviewFeedback(pr);
  if (!feedback.trim()) return 'nofeedback';
  console.log(`💬 feedback:\n${feedback}\n`);

  await checkoutBranch(branch);

  const paths = await getPRFiles(pr);
  const current: FileChange[] = [];
  for (const p of paths) {
    const content = await readFile(p);
    if (content) current.push({ path: p, content });
  }

  let output = '';
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const changes = await llm.revise(meta.title, feedback, current, output);
    const written = await writeFiles(changes);
    console.log(`🔧 applied: ${written.join(', ')}`);

    const result = await verify();
    if (result.passed) {
      console.log('✅ tests + build green');
      if (config.dryRun) {
        console.log('🔗 (dry-run) would commit, push, and comment on the PR');
        return 'revised';
      }
      await commitAndPush(branch, `review: apply PR #${pr} feedback`);
      await commentPR(pr, '🤖 Pushed revision addressing review feedback. Tests + build green.');
      console.log(`📨 revision pushed to PR #${pr}`);

      const m = branch.match(/^agent\/task-(.+)$/);
      if (m) {
        await clickup.addComment(m[1], `🤖 Revised PR #${pr} per review feedback.`).catch(() => {});
      }
      return 'revised';
    }

    console.log(`❌ not green (attempt ${attempt}/${config.maxAttempts})`);
    output = result.output;
  }

  return 'failed';
}
