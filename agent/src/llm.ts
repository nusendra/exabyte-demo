import { ChatDeepSeek } from '@langchain/deepseek';
import { z } from 'zod';
import { config } from './config.js';
import { readFile } from './clients/repo.js';
import type { ClickUpTask, FileChange, Plan } from './state.js';

function model() {
  return new ChatDeepSeek({
    model: config.model,
    apiKey: config.deepseekApiKey,
    temperature: 0,
    maxTokens: 8000
  });
}

// Files the agent is allowed to read for context / edit. Small on purpose.
const CONTEXT_FILES = [
  'web/src/lib/posts.ts',
  'web/src/lib/posts.test.ts',
  'web/src/lib/data/posts.json',
  'web/src/routes/+page.svelte',
  'web/src/routes/blog/[slug]/+page.svelte'
];

async function repoContext(): Promise<string> {
  const parts: string[] = [];
  for (const f of CONTEXT_FILES) {
    const content = await readFile(f);
    if (content) parts.push(`--- ${f} ---\n${content}`);
  }
  return parts.join('\n\n');
}

/** Pull a JSON object out of a model reply (handles code fences / stray prose). */
function extractJson(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  return t;
}

/**
 * Ask the model for JSON and validate with zod. Uses plain text output + a
 * strict "JSON only" instruction instead of forced tool calls, so it works
 * with DeepSeek thinking models (which reject a forced tool_choice).
 */
async function askJson<T>(
  schema: z.ZodType<T>,
  shape: string,
  system: string,
  user: string
): Promise<T> {
  const sys =
    system +
    '\n\nReturn ONLY a single JSON object, no markdown fences and no commentary, ' +
    `matching exactly this shape:\n${shape}`;

  const llm = model();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await llm.invoke([
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ]);
    const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    try {
      return schema.parse(JSON.parse(extractJson(text)));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Model did not return valid JSON: ${String(lastErr)}`);
}

const planSchema = z.object({
  summary: z.string(),
  targetFiles: z.array(z.string()),
  testFile: z.string()
});
const PLAN_SHAPE = '{ "summary": string, "targetFiles": string[], "testFile": string }';

const changesSchema = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() }))
});
const CHANGES_SHAPE = '{ "files": [ { "path": string, "content": string } ] }';

/** Turn a ClickUp task into an implementation plan. */
export async function makePlan(task: ClickUpTask): Promise<Plan> {
  const ctx = await repoContext();
  return askJson(
    planSchema,
    PLAN_SHAPE,
    'You are a senior engineer working in a SvelteKit + TypeScript blog. ' +
      'Posts live in a JSON file, read via web/src/lib/posts.ts. Tests use vitest. ' +
      'Plan the smallest change that satisfies the task and is verifiable by a unit test. ' +
      'targetFiles are repo-relative (e.g. web/src/lib/posts.ts); testFile is a .test.ts under web/src/lib.',
    `TASK: ${task.title}\n\n${task.description}\n\nREPO CONTEXT:\n${ctx}`
  );
}

/** Author a failing test that captures the task's acceptance criteria. */
export async function writeTest(task: ClickUpTask, plan: Plan): Promise<FileChange[]> {
  const ctx = await repoContext();
  const { files } = await askJson(
    changesSchema,
    CHANGES_SHAPE,
    'Write ONE runnable vitest test file (TypeScript). Rules:\n' +
      '- Import every helper you use from "vitest" (describe, it, expect, beforeAll, ...).\n' +
      '- Tests run in Node (no browser/DOM, no jsdom). Do not assert on rendered pages.\n' +
      '- Prefer importing an exported function/value and asserting its behavior over ' +
      'regex-matching file contents. Only add a new exported helper under web/src/lib ' +
      'if the feature is pure logic (e.g. formatting, counts).\n' +
      '- Use relative import paths that are CORRECT from the test file location, and that ' +
      'exactly match where the implementation will put the code.\n' +
      '- Put test files under web/src/lib/ (e.g. web/src/lib/<feature>.test.ts). NEVER create a ' +
      'file whose name starts with "+" — SvelteKit reserves those and the build will fail.\n' +
      '- Keep it small, self-consistent, and free of undefined references.',
    `TASK: ${task.title}\n\n${task.description}\n\nPLAN: ${plan.summary}\n` +
      `TEST FILE PATH: ${plan.testFile}\n\nREPO CONTEXT:\n${ctx}`
  );
  return files;
}

/** Apply PR review feedback to the current branch. */
export async function revise(
  prTitle: string,
  feedback: string,
  currentFiles: FileChange[],
  verifyOutput: string
): Promise<FileChange[]> {
  const ctx = currentFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n');
  const { files } = await askJson(
    changesSchema,
    CHANGES_SHAPE,
    'Apply the reviewer feedback to this pull request. Rules:\n' +
      '- Return WHOLE contents of only the files you change.\n' +
      '- Address every point in the feedback; keep unrelated code intact.\n' +
      '- Keep the vitest suite AND the production build green. Never create a file whose ' +
      'name starts with "+" (SvelteKit reserves those). Tests live under web/src/lib/.\n' +
      '- Do not weaken or delete existing test assertions.',
    `PR: ${prTitle}\n\nREVIEWER FEEDBACK:\n${feedback}\n` +
      (verifyOutput ? `\nLATEST TEST/BUILD OUTPUT:\n${verifyOutput}\n` : '') +
      `\nCURRENT FILES:\n${ctx}`
  );
  return files;
}

/** Implement the feature so the test passes. `feedback` carries prior test output. */
export async function implement(
  task: ClickUpTask,
  plan: Plan,
  feedback: string
): Promise<FileChange[]> {
  const ctx = await repoContext();
  const { files } = await askJson(
    changesSchema,
    CHANGES_SHAPE,
    'Implement the feature by returning full contents of the files to change. Rules:\n' +
      '- Keep changes minimal and consistent with existing style. Return WHOLE files.\n' +
      '- Preserve unrelated existing markup/exports (e.g. do not delete a layout header/footer ' +
      'when only styling is requested).\n' +
      '- Make the implementation match the test exactly: same import paths, file locations, ' +
      'and exported names the test references.\n' +
      '- Do not weaken or delete assertions. You MAY fix a test file ONLY if it is broken ' +
      'scaffolding (missing vitest imports, wrong relative path, syntax error) — keep its intent ' +
      'and every assertion. If you fix the test, include it in the returned files.',
    `TASK: ${task.title}\n\n${task.description}\n\nPLAN: ${plan.summary}\n` +
      `TARGET FILES: ${plan.targetFiles.join(', ')}\n` +
      (feedback ? `\nPREVIOUS TEST OUTPUT (make these pass):\n${feedback}\n` : '') +
      `\nREPO CONTEXT:\n${ctx}`
  );
  return files;
}
