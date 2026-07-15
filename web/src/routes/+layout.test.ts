import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('+layout.svelte', () => {
  let source: string;

  beforeAll(() => {
    const layoutPath = resolve(__dirname, '+layout.svelte');
    source = readFileSync(layoutPath, 'utf-8');
  });

  it('exists and contains a style block', () => {
    expect(source).toContain('<style>');
  });

  it('contains global body styles', () => {
    expect(source).toContain(':global(body)');
  });

  it('renders children via {@render children()}', () => {
    expect(source).toContain('{@render children()}');
  });
});
