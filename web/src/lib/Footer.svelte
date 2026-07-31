<script lang="ts">
  import { FOOTER_LINKS } from './footer';
</script>

<footer class="site-footer">
  <nav class="footer-nav">
    <ul>
      {#each FOOTER_LINKS as item (item.label)}
        <li><a href={item.href}>{item.label}</a></li>
      {/each}
    </ul>
  </nav>
</footer>

<style>
  .site-footer {
    padding: 1.5rem 1.25rem;
    border-top: 1px solid #e5e5e5;
    margin-top: 2rem;
  }
  .footer-nav ul {
    list-style: none;
    display: flex;
    gap: 1.5rem;
    padding: 0;
    margin: 0;
    justify-content: center;
  }
  .footer-nav a {
    text-decoration: none;
    color: #333;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .footer-nav a:hover {
    color: #000;
  }
</style>
