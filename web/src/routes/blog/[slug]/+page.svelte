<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const post = $derived(data.post);
</script>

<svelte:head>
  <title>{post.title} — Exabyte Blog</title>
</svelte:head>

<article>
  <a class="back" href="/">← All posts</a>
  <h1>{post.title}</h1>
  <p class="meta">{post.date} · {post.tags.join(', ')}</p>

  {#each post.body.split('\n\n') as paragraph}
    <p>{paragraph}</p>
  {/each}
</article>

<style>
  .back {
    display: inline-block;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: #666;
    text-decoration: none;
  }
  h1 {
    margin: 0 0 0.35rem;
    font-size: 1.9rem;
  }
  .meta {
    margin: 0 0 1.5rem;
    font-size: 0.82rem;
    color: #999;
  }
  article :global(p) {
    line-height: 1.7;
    color: #333;
  }
</style>
