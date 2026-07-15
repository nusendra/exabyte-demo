<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Exabyte Blog</title>
</svelte:head>

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
