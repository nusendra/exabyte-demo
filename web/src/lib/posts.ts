import postsData from './data/posts.json';

export interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  body: string;
}

const posts = postsData as Post[];

/** All posts, newest first. */
export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

/** A single post by slug, or undefined if not found. */
export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
