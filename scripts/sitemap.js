// Writes dist/sitemap.xml from the pages the build produced, so search engines find every week page.
// Runs after "astro build". Usage: node scripts/sitemap.js
import fs from 'node:fs';
import path from 'node:path';
import { config } from './lib/config.js';

const dist = path.resolve('dist');
const urls = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') urls.push(path.relative(dist, dir).split(path.sep).join('/'));
  }
};
walk(dist);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .sort()
  .map((u) => `  <url><loc>${esc(`${config.site.url}/${u ? `${u}/` : ''}`)}</loc></url>`)
  .join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
console.log(`[sitemap] ${urls.length} pages`);
