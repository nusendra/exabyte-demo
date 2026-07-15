import { config } from './config.js';
import { buildGraph } from './graph.js';

async function main() {
  const taskId = process.argv[2];
  if (!taskId) {
    console.error('Usage: npm run agent -- <clickup-task-id>');
    process.exit(1);
  }

  if (!config.fakeLlm && !config.anthropicApiKey) {
    console.error('Missing ANTHROPIC_API_KEY (or set FAKE_LLM=1 for a wiring test).');
    process.exit(1);
  }
  if (!config.fakeLlm && !config.clickupToken) {
    console.error('Missing CLICKUP_TOKEN (or set FAKE_LLM=1 for a wiring test).');
    process.exit(1);
  }

  console.log(
    `🤖 agent starting — model=${config.model} dryRun=${config.dryRun} fakeLlm=${config.fakeLlm}`
  );

  const graph = buildGraph();
  const result = await graph.invoke(
    { taskId },
    { recursionLimit: 50 }
  );

  console.log('\n─── done ───');
  if (result.prUrl) console.log(`PR: ${result.prUrl}`);
  if (result.error) {
    console.log(`Result: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('agent failed:', err);
  process.exit(1);
});
