import type { ClickUpTask, FileChange, Plan } from './state.js';

// Used when FAKE_LLM=1 so the graph can be exercised end-to-end with no
// Anthropic key and no network — proves the wiring, not the model.

export const MOCK_TASK: ClickUpTask = {
  title: 'Add a reading-time helper for posts',
  description:
    'Add a readingTime(text) helper under web/src/lib that estimates minutes ' +
    'to read at 200 words per minute, rounded up. Empty text is 0 minutes. ' +
    'Cover it with a vitest test.',
  status: 'to do'
};

export const MOCK_PLAN: Plan = {
  summary:
    'Add web/src/lib/readingTime.ts exporting readingTime(text) = ceil(words/200), ' +
    'with a vitest test asserting 200 words -> 1 min, 201 -> 2 min, empty -> 0.',
  targetFiles: ['web/src/lib/readingTime.ts'],
  testFile: 'web/src/lib/readingTime.test.ts'
};

export const MOCK_TEST: FileChange[] = [
  {
    path: 'web/src/lib/readingTime.test.ts',
    content: `import { describe, it, expect } from 'vitest';
import { readingTime } from './readingTime';

describe('readingTime', () => {
  it('estimates minutes at 200 wpm, rounded up', () => {
    expect(readingTime('word '.repeat(200))).toBe(1);
    expect(readingTime('word '.repeat(201))).toBe(2);
  });

  it('treats empty text as 0 minutes', () => {
    expect(readingTime('')).toBe(0);
  });
});
`
  }
];

export const MOCK_IMPL: FileChange[] = [
  {
    path: 'web/src/lib/readingTime.ts',
    content: `/** Estimate reading time in minutes at 200 words/min, rounded up. */
export function readingTime(text: string): number {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\\s+/).length : 0;
  return Math.ceil(words / 200);
}
`
  }
];
