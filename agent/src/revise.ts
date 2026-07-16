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

// Read a PR's review feedback and push fixes to the same branch, keeping
// tests + build green. Usage: npm run revise -- <PR-number>

async function verify(): Promise<{ passed: boolean; output: string }> {
  const test = await runWebTests();
  if (!test.passed) return { passed: false, output: test.output };
  const build = await runWebBuild();
  if (!build.passed) {
    return { passed: false, output: `Tests pass but BUILD FAILED:\n${build.output}` };
  }
  return { passed: true, output: test.output };
}

async function main() {
  const pr = process.argv[2];
  if (!pr) {
    console.error('Usage: npm run revise -- <PR-number>');
    process.exit(1);
  }
  if (!config.deepseekApiKey) {
    console.error('Missing DEEPSEEK_API_KEY.');
    process.exit(1);
  }

  const { headRefName: branch, title } = await getPR(pr);
  console.log(`\n🔁 revising PR #${pr} (${title}) on branch ${branch}`);

  const feedback = await getReviewFeedback(pr);
  if (!feedback.trim()) {
    console.error('No review comments/feedback found on this PR. Nothing to revise.');
    process.exit(1);
  }
  console.log(`💬 feedback:\n${feedback}\n`);

  await checkoutBranch(branch);

  // Current contents of the PR's files for context.
  const paths = await getPRFiles(pr);
  const current: FileChange[] = [];
  for (const p of paths) {
    const content = await readFile(p);
    if (content) current.push({ path: p, content });
  }

  let output = '';
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const changes = await llm.revise(title, feedback, current, output);
    const written = await writeFiles(changes);
    console.log(`🔧 applied: ${written.join(', ')}`);

    const result = await verify();
    if (result.passed) {
      console.log('✅ tests + build green');
      if (config.dryRun) {
        console.log('🔗 (dry-run) would commit, push, and comment on the PR');
        return;
      }
      await commitAndPush(branch, `review: apply PR #${pr} feedback`);
      await commentPR(pr, '🤖 Pushed revision addressing review feedback. Tests + build green.');
      console.log(`📨 revision pushed to PR #${pr}`);

      // Best-effort: nudge the ClickUp task if the branch encodes its id.
      const m = branch.match(/^agent\/task-(.+)$/);
      if (m) {
        await clickup
          .addComment(m[1], `🤖 Revised PR #${pr} per review feedback.`)
          .catch(() => {});
      }
      return;
    }

    console.log(`❌ not green (attempt ${attempt}/${config.maxAttempts})`);
    output = result.output;
  }

  console.error(`Could not satisfy tests+build after ${config.maxAttempts} attempts.`);
  process.exit(1);
}

main().catch((err) => {
  console.error('revise failed:', err);
  process.exit(1);
});
