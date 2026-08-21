import { describe, it, expect } from 'vitest';
import {
  getAllPosts,
  getPost,
  BACKGROUND_COLOR,
  HERO_NAV_ITEMS,
  HERO_TITLE
} from './posts';

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

  it('BACKGROUND_COLOR is a valid hex color', () => {
    expect(BACKGROUND_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  // --- Hero section nav menu ---

  it('HERO_TITLE is the blog title text', () => {
    expect(HERO_TITLE).toBe("Nusendra's Blog");
  });

  it('HERO_NAV_ITEMS has exactly three items', () => {
    expect(HERO_NAV_ITEMS).toHaveLength(3);
  });

  it('HERO_NAV_ITEMS contains Home, Blog, and About Us in order', () => {
    const labels = HERO_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(['Home', 'Blog', 'About Us']);
  });

  it('every HERO_NAV_ITEMS link points to home', () => {
    for (const item of HERO_NAV_ITEMS) {
      expect(item.href).toBe('/');
    }
  });

  it('each HERO_NAV_ITEMS entry has label and href fields', () => {
    for (const item of HERO_NAV_ITEMS) {
      expect(item.label).toBeTypeOf('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.href).toBeTypeOf('string');
      expect(item.href.length).toBeGreaterThan(0);
    }
  });
});
