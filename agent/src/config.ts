import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const agentDir = path.dirname(fileURLToPath(import.meta.url)); // .../agent/src
const defaultRepoDir = path.resolve(agentDir, '..', '..'); // monorepo root

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  clickupToken: process.env.CLICKUP_TOKEN ?? '',
  reviewStatus: process.env.CLICKUP_TASK_STATUS_REVIEW ?? 'in review',
  model: process.env.AGENT_MODEL ?? 'claude-opus-4-8',
  repoDir: process.env.REPO_DIR
    ? path.resolve(process.cwd(), process.env.REPO_DIR)
    : defaultRepoDir,
  baseBranch: process.env.BASE_BRANCH ?? 'main',
  maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 3),
  dryRun: process.env.DRY_RUN === '1',
  fakeLlm: process.env.FAKE_LLM === '1'
};

/** Absolute path to the SvelteKit app the agent edits. */
export const webDir = path.join(config.repoDir, 'web');
