import { config } from './config.js';
import * as clickup from './clients/clickup.js';
import {
  commitAndPush,
  createBranch,
  openPR,
  runWebBuild,
  runWebTests,
  writeFiles
} from './clients/repo.js';
import * as llm from './llm.js';
import { MOCK_IMPL, MOCK_PLAN, MOCK_TASK, MOCK_TEST } from './fixtures.js';
import type { AgentStateType } from './state.js';

/** 1. Fetch the task from ClickUp (or use a mock when FAKE_LLM=1). */
export async function fetchTask(state: AgentStateType) {
  const task = config.fakeLlm ? MOCK_TASK : await clickup.getTask(state.taskId);
  console.log(`\n📥 task ${state.taskId}: ${task.title}`);
  return { task, attempts: 0 };
}

/** 2. Plan the change. */
export async function planNode(state: AgentStateType) {
  const plan = config.fakeLlm ? MOCK_PLAN : await llm.makePlan(state.task!);
  console.log(`📋 plan: ${plan.summary}`);
  return { plan };
}

/** 3. Create the working branch. */
export async function prepareBranch(state: AgentStateType) {
  const branch = `agent/task-${state.taskId}`;
  if (config.dryRun) {
    console.log(`🌱 (dry-run) would create branch ${branch}`);
  } else {
    await createBranch(branch);
    console.log(`🌱 branch ${branch}`);
  }
  return { branch };
}

/** 4. Write a failing test that captures acceptance criteria. */
export async function writeTestNode(state: AgentStateType) {
  const changes = config.fakeLlm ? MOCK_TEST : await llm.writeTest(state.task!, state.plan!);
  const written = await writeFiles(changes);
  console.log(`🧪 wrote test: ${written.join(', ')}`);
  return { changedFiles: written };
}

/** 5. Implement until the test passes (retried by the verify edge). */
export async function implementNode(state: AgentStateType) {
  const changes = config.fakeLlm
    ? MOCK_IMPL
    : await llm.implement(state.task!, state.plan!, state.testOutput ?? '');
  const written = await writeFiles(changes);
  const all = Array.from(new Set([...(state.changedFiles ?? []), ...written]));
  console.log(`🔧 implemented: ${written.join(', ')}`);
  return { changedFiles: all };
}

/** 6. Gate the PR: tests must pass AND the production build must succeed. */
export async function verifyNode(state: AgentStateType) {
  const attempts = (state.attempts ?? 0) + 1;

  const test = await runWebTests();
  if (!test.passed) {
    console.log(`❌ tests fail (attempt ${attempts}/${config.maxAttempts})`);
    return { testPassed: false, testOutput: test.output, attempts };
  }
  console.log('✅ tests pass — building…');

  const build = await runWebBuild();
  if (!build.passed) {
    console.log(`❌ build fails (attempt ${attempts}/${config.maxAttempts})`);
    return {
      testPassed: false,
      testOutput: `Tests passed but the production build FAILED. Fix the build.\n\n${build.output}`,
      attempts
    };
  }

  console.log('✅ build ok');
  return { testPassed: true, testOutput: test.output, attempts };
}

/** 7. Commit, push, and open the PR. */
export async function createPRNode(state: AgentStateType) {
  const title = `${state.task!.title} (ClickUp ${state.taskId})`;
  const body =
    `Automated change for ClickUp task \`${state.taskId}\`.\n\n` +
    `**Plan:** ${state.plan?.summary ?? ''}\n\n` +
    `**Files:** ${(state.changedFiles ?? []).map((f) => `\`${f}\``).join(', ')}\n\n` +
    `Tests: passing ✅`;

  if (config.dryRun) {
    console.log('🔗 (dry-run) would commit, push, and open PR');
    return { prUrl: 'https://example.com/pr/dry-run' };
  }
  await commitAndPush(state.branch, title);
  const url = await openPR(title, body);
  console.log(`🔗 PR: ${url}`);
  return { prUrl: url };
}

/** 8a. Update ClickUp: move to review + comment the PR link. */
export async function updateClickupNode(state: AgentStateType) {
  if (config.dryRun || config.fakeLlm) {
    console.log(`📨 (dry-run) would move task to "${config.reviewStatus}" and comment ${state.prUrl}`);
    return {};
  }
  await clickup.setStatus(state.taskId, config.reviewStatus);
  await clickup.addComment(
    state.taskId,
    `🤖 PR opened: ${state.prUrl}\n\n${state.plan?.summary ?? ''}`
  );
  console.log(`📨 ClickUp updated -> ${config.reviewStatus}`);
  return {};
}

/** 8b. Give up after exhausting retries: report the failure. */
export async function reportFailureNode(state: AgentStateType) {
  const msg = `🤖 Agent could not make tests pass after ${config.maxAttempts} attempts.`;
  if (config.dryRun || config.fakeLlm) {
    console.log(`⚠️  (dry-run) would comment failure on task`);
  } else {
    await clickup.addComment(state.taskId, `${msg}\n\nLast test output:\n${state.testOutput ?? ''}`);
    console.log(`⚠️  ${msg}`);
  }
  return { error: msg };
}

/** Conditional edge after verify. */
export function afterVerify(state: AgentStateType): 'createPR' | 'implement' | 'reportFailure' {
  if (state.testPassed) return 'createPR';
  if ((state.attempts ?? 0) < config.maxAttempts) return 'implement';
  return 'reportFailure';
}
