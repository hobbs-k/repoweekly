import { defineConfig } from 'astro/config';

// Static output in /dist. SITE_URL is set by the deploy workflow. It may include a path,
// for example https://user.github.io/repoweekly, which becomes Astro's base.
const site = new URL(process.env.SITE_URL || 'https://repoweekly.example');

export default defineConfig({
  site: site.origin,
  base: site.pathname,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
