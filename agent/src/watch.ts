import { config } from './config.js';
import * as clickup from './clients/clickup.js';
import { getPRActivity, listOpenAgentPRs } from './clients/repo.js';
import { buildGraph } from './graph.js';
import { revisePR } from './revise-core.js';

// One watcher does two things each poll:
//  1) New tickets in the trigger status -> run the agent (task -> PR).
//  2) Open agent PRs whose newest review is newer than the last commit ->
//     auto-revise from the feedback and push. Pushing a commit makes the
//     last commit newest again, so it stops until the next review arrives.

const graph = buildGraph();
const inFlight = new Set<string>();
const prInFlight = new Set<number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runTask(id: string, title: string) {
  console.log(`\n🔔 new ticket ${id}: ${title}`);
  try {
    // Claim it first so a slow run isn't picked up twice.
    if (!config.dryRun) {
      await clickup.setStatus(id, config.inProgressStatus);
    }
    await graph.invoke({ taskId: id }, { recursionLimit: 50 });
  } catch (err) {
    console.error(`❌ task ${id} failed:`, err);
  } finally {
    inFlight.delete(id);
  }
}

async function reviseOpenPRs() {
  const prs = await listOpenAgentPRs();
  for (const { number, branch } of prs) {
    if (prInFlight.has(number)) continue;
    const { lastReview, lastCommit } = await getPRActivity(String(number));
    // Act only when a review landed after the most recent code push.
    if (lastReview !== null && (lastCommit === null || lastReview > lastCommit)) {
      prInFlight.add(number);
      console.log(`\n📝 PR #${number} has new review feedback`);
      try {
        await revisePR(String(number), branch);
      } catch (err) {
        console.error(`❌ revise PR #${number} failed:`, err);
      } finally {
        prInFlight.delete(number);
      }
    }
  }
}

async function tick() {
  // 1) New tickets.
  const tasks = await clickup.getTasksByStatus(config.clickupListId, config.triggerStatus);
  for (const t of tasks) {
    if (inFlight.has(t.id)) continue;
    inFlight.add(t.id);
    // Run sequentially: await so branches/tests don't clash on the working tree.
    await runTask(t.id, t.title);
  }

  // 2) In-review PRs needing changes.
  await reviseOpenPRs();
}

async function main() {
  if (!config.fakeLlm && !config.deepseekApiKey) {
    console.error('Missing DEEPSEEK_API_KEY.');
    process.exit(1);
  }
  if (!config.clickupToken) {
    console.error('Missing CLICKUP_TOKEN.');
    process.exit(1);
  }
  if (!config.clickupListId) {
    console.error('Missing CLICKUP_LIST_ID (the list the agent watches).');
    process.exit(1);
  }

  console.log(
    `👀 watching list ${config.clickupListId} for status "${config.triggerStatus}" ` +
      `and open agent PRs for review feedback — every ${config.pollIntervalMs}ms — ` +
      `model=${config.model} dryRun=${config.dryRun}`
  );

  // Poll forever. Ctrl-C to stop.
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error('poll error:', err);
    }
    await sleep(config.pollIntervalMs);
  }
}

main().catch((err) => {
  console.error('watcher crashed:', err);
  process.exit(1);
});
