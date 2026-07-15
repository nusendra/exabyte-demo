import { config } from './config.js';
import * as clickup from './clients/clickup.js';
import { buildGraph } from './graph.js';

// Watch a ClickUp list and run the agent on every task that enters the
// trigger status. A task is "claimed" by moving it to the in-progress status
// before the graph runs, so the next poll will not pick it up again.

const graph = buildGraph();
const inFlight = new Set<string>();

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

async function tick() {
  const tasks = await clickup.getTasksByStatus(config.clickupListId, config.triggerStatus);
  for (const t of tasks) {
    if (inFlight.has(t.id)) continue;
    inFlight.add(t.id);
    // Run sequentially: await so branches/tests don't clash on the working tree.
    await runTask(t.id, t.title);
  }
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
      `every ${config.pollIntervalMs}ms — model=${config.model} dryRun=${config.dryRun}`
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
