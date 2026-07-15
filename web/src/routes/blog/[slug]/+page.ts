import { error } from '@sveltejs/kit';
import { getAllPosts, getPost } from '$lib/posts';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

// Prerender one page per post slug.
export const entries: EntryGenerator = () => {
  return getAllPosts().map((p) => ({ slug: p.slug }));
};

export const load: PageLoad = ({ params }) => {
  const post = getPost(params.slug);
  if (!post) {
    throw error(404, 'Post not found');
  }
  return { post };
};
