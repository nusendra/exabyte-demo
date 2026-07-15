import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const agentDir = path.dirname(fileURLToPath(import.meta.url)); // .../agent/src
const defaultRepoDir = path.resolve(agentDir, '..', '..'); // monorepo root

export const config = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
  clickupToken: process.env.CLICKUP_TOKEN ?? '',
  clickupListId: process.env.CLICKUP_LIST_ID ?? '',
  reviewStatus: process.env.CLICKUP_TASK_STATUS_REVIEW ?? 'in review',
  // watch mode: pick up tasks in this status, claim them by moving to inProgress.
  triggerStatus: process.env.CLICKUP_TRIGGER_STATUS ?? 'to do',
  inProgressStatus: process.env.CLICKUP_INPROGRESS_STATUS ?? 'in progress',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 15000),
  model: process.env.AGENT_MODEL ?? 'deepseek-v4-flash',
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
