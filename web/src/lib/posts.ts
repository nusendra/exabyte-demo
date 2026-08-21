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

/** Background color for the page body. */
export const BACKGROUND_COLOR = '#f5fff5';

/** Title shown in the hero section. */
export const HERO_TITLE = "Nusendra's Blog";

export interface NavItem {
  label: string;
  href: string;
}

/** Nav menu items shown in the hero section. */
export const HERO_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Blog', href: '/' },
  { label: 'About Us', href: '/' }
];
