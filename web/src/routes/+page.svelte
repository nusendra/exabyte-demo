<script lang="ts">
  import type { PageData } from './$types';
  import { BACKGROUND_COLOR, HERO_TITLE, HERO_NAV_ITEMS } from '$lib/posts';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Exabyte Blog</title>
  <style>body { background-color: {BACKGROUND_COLOR}; }</style>
</svelte:head>

<section class="hero">
  <nav class="hero-nav">
    <ul>
      {#each HERO_NAV_ITEMS as item (item.label)}
        <li><a href={item.href}>{item.label}</a></li>
      {/each}
    </ul>
  </nav>
  <h1 class="hero-title">{HERO_TITLE}</h1>
</section>

<ul class="posts">
  {#each data.posts as post (post.slug)}
    <li>
      <a href={`/blog/${post.slug}`}>
        <h2>{post.title}</h2>
        <p class="meta">{post.date} · {post.tags.join(', ')}</p>
        <p class="excerpt">{post.excerpt}</p>
      </a>
    </li>
  {/each}
</ul>

<style>
  .hero {
    background-color: #f0f0f0;
    padding: 2rem 1.25rem;
    border-radius: 10px;
    margin-bottom: 1.5rem;
  }
  .hero-nav ul {
    list-style: none;
    display: flex;
    gap: 1.5rem;
    padding: 0;
    margin: 0 0 1.5rem;
  }
  .hero-nav a {
    text-decoration: none;
    color: #333;
    font-size: 0.95rem;
    font-weight: 500;
  }
  .hero-nav a:hover {
    color: #000;
  }
  .hero-title {
    margin: 0;
    font-size: 2rem;
    color: #222;
  }
  .posts {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 1rem;
  }
  li a {
    display: block;
    padding: 1.1rem 1.25rem;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s;
  }
  li a:hover {
    border-color: #bbb;
  }
  h2 {
    margin: 0 0 0.25rem;
    font-size: 1.15rem;
  }
  .meta {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    color: #999;
  }
  .excerpt {
    margin: 0;
    color: #444;
    font-size: 0.95rem;
  }
</style>
