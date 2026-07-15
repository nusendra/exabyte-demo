<script lang="ts">
  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

{@render children()}

<style>
  :global(body) {
    margin: 0;
    padding: 2rem 1.5rem;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: #fafafa;
    color: #222;
    line-height: 1.5;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
