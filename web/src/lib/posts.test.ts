import { describe, it, expect } from 'vitest';
import { getAllPosts, getPost } from './posts';

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

  // --- Demo blog post feature ---

  it('includes the new demo blog post in getAllPosts', () => {
    const posts = getAllPosts();
    const demo = posts.find((p) => p.slug === 'demo-blog-post');
    expect(demo).toBeDefined();
  });

  it('the new demo blog post has all required fields', () => {
    const post = getPost('demo-blog-post');
    expect(post).toBeDefined();
    expect(post!.title).toBeTypeOf('string');
    expect(post!.title.length).toBeGreaterThan(0);
    expect(post!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(post!.tags).toBeInstanceOf(Array);
    expect(post!.excerpt).toBeTypeOf('string');
    expect(post!.excerpt.length).toBeGreaterThan(0);
    expect(post!.body).toBeTypeOf('string');
    expect(post!.body.length).toBeGreaterThan(0);
  });

  it('finds the new demo blog post by its slug', () => {
    const post = getPost('demo-blog-post');
    expect(post?.slug).toBe('demo-blog-post');
  });

  it('the new demo blog post appears in the sorted list', () => {
    const posts = getAllPosts();
    const slugs = posts.map((p) => p.slug);
    expect(slugs).toContain('demo-blog-post');
  });

  // --- New blog post: 'Why Developers Should Learn About AI' ---

  it('includes the new \'Why Developers Should Learn About AI\' post in getAllPosts', () => {
    const posts = getAllPosts();
    const newPost = posts.find((p) => p.slug === 'why-developers-should-learn-about-ai');
    expect(newPost).toBeDefined();
  });

  it('the new post has all required fields', () => {
    const post = getPost('why-developers-should-learn-about-ai');
    expect(post).toBeDefined();
    expect(post!.title).toBeTypeOf('string');
    expect(post!.title.length).toBeGreaterThan(0);
    expect(post!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(post!.tags).toBeInstanceOf(Array);
    expect(post!.excerpt).toBeTypeOf('string');
    expect(post!.excerpt.length).toBeGreaterThan(0);
    expect(post!.body).toBeTypeOf('string');
    expect(post!.body.length).toBeGreaterThan(0);
  });

  it('the new post has the correct title', () => {
    const post = getPost('why-developers-should-learn-about-ai');
    expect(post?.title).toBe('Why Developers Should Learn About AI');
  });

  it('finds the new post by its slug', () => {
    const post = getPost('why-developers-should-learn-about-ai');
    expect(post?.slug).toBe('why-developers-should-learn-about-ai');
  });

  it('the new post appears in the sorted list', () => {
    const posts = getAllPosts();
    const slugs = posts.map((p) => p.slug);
    expect(slugs).toContain('why-developers-should-learn-about-ai');
  });
});