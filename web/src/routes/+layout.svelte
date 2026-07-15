<script lang="ts">
  let { children } = $props();
</script>

<div class="site">
  <header>
    <a class="brand" href="/">Exabyte Blog</a>
    <span class="tag">SvelteKit + JSON</span>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <p>Demo blog — posts served from a JSON file.</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: #1a1a1a;
    background: #fafafa;
  }
  .site {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1.25rem;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 2rem 0 1rem;
    border-bottom: 1px solid #e5e5e5;
  }
  .brand {
    font-size: 1.35rem;
    font-weight: 700;
    text-decoration: none;
    color: #1a1a1a;
  }
  .tag {
    font-size: 0.75rem;
    color: #888;
  }
  main {
    padding: 1.5rem 0 3rem;
  }
  footer {
    padding: 1.5rem 0;
    border-top: 1px solid #e5e5e5;
    font-size: 0.8rem;
    color: #999;
  }
</style>
