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

const planSchema = z.object({
  summary: z.string().describe('One-paragraph implementation approach.'),
  targetFiles: z
    .array(z.string())
    .describe('Repo-relative source files to change, e.g. web/src/lib/posts.ts.'),
  testFile: z
    .string()
    .describe('Repo-relative path of the vitest file to add, ending in .test.ts under web/src.')
});

const changesSchema = z.object({
  files: z
    .array(z.object({ path: z.string(), content: z.string() }))
    .describe('Full contents of each file to write (whole-file, not a diff).')
});

/** Turn a ClickUp task into an implementation plan. */
export async function makePlan(task: ClickUpTask): Promise<Plan> {
  const llm = model().withStructuredOutput(planSchema, { name: 'plan' });
  const ctx = await repoContext();
  const res = await llm.invoke([
    {
      role: 'system',
      content:
        'You are a senior engineer working in a SvelteKit + TypeScript blog. ' +
        'Posts live in a JSON file, read via web/src/lib/posts.ts. Tests use vitest. ' +
        'Plan the smallest change that satisfies the task and is verifiable by a unit test.'
    },
    {
      role: 'user',
      content: `TASK: ${task.title}\n\n${task.description}\n\nREPO CONTEXT:\n${ctx}`
    }
  ]);
  return res as Plan;
}

/** Author a failing test that captures the task's acceptance criteria. */
export async function writeTest(task: ClickUpTask, plan: Plan): Promise<FileChange[]> {
  const llm = model().withStructuredOutput(changesSchema, { name: 'test' });
  const ctx = await repoContext();
  const res = await llm.invoke([
    {
      role: 'system',
      content:
        'Write a vitest test file (TypeScript) for the described feature. ' +
        'Import from the modules under web/src/lib. Return only the test file. ' +
        'It is fine if it fails until the implementation exists.'
    },
    {
      role: 'user',
      content:
        `TASK: ${task.title}\n\n${task.description}\n\nPLAN: ${plan.summary}\n` +
        `TEST FILE PATH: ${plan.testFile}\n\nREPO CONTEXT:\n${ctx}`
    }
  ]);
  return (res as z.infer<typeof changesSchema>).files;
}

/** Implement the feature so the test passes. `feedback` carries prior test output. */
export async function implement(
  task: ClickUpTask,
  plan: Plan,
  feedback: string
): Promise<FileChange[]> {
  const llm = model().withStructuredOutput(changesSchema, { name: 'implement' });
  const ctx = await repoContext();
  const res = await llm.invoke([
    {
      role: 'system',
      content:
        'Implement the feature by returning full contents of the files to change. ' +
        'Keep changes minimal and consistent with existing style. Do not edit test files.'
    },
    {
      role: 'user',
      content:
        `TASK: ${task.title}\n\n${task.description}\n\nPLAN: ${plan.summary}\n` +
        `TARGET FILES: ${plan.targetFiles.join(', ')}\n` +
        (feedback ? `\nPREVIOUS TEST OUTPUT (make these pass):\n${feedback}\n` : '') +
        `\nREPO CONTEXT:\n${ctx}`
    }
  ]);
  return (res as z.infer<typeof changesSchema>).files;
}
