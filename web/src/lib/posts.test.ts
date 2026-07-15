import { describe, it, expect } from 'vitest';
import { getAllPosts, getPost } from './posts';

// Pattern the AI agent follows when adding tests for new features.
describe('posts', () => {
  it('returns all seed posts', () => {
    expect(getAllPosts().length).toBeGreaterThanOrEqual(3);
  });

  it('sorts posts newest first', () => {
    const dates = getAllPosts().map((p) => p.date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  it('finds a post by slug', () => {
    const post = getPost('hello-svelte');
    expect(post?.title).toBe('Hello, Svelte');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getPost('does-not-exist')).toBeUndefined();
  });
});
