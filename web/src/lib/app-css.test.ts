import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('app.css', () => {
  const cssPath = resolve(__dirname, '../app.css');
  let css: string;

  beforeAll(() => {
    css = readFileSync(cssPath, 'utf-8');
  });

  it('sets body background-color to black', () => {
    expect(css).toMatch(/background-color\s*:\s*black/i);
  });

  it('sets body color to white', () => {
    expect(css).toMatch(/color\s*:\s*white/i);
  });

  it('sets all elements color to white', () => {
    expect(css).toMatch(/\*\s*\{[^}]*color\s*:\s*white/i);
  });
});
