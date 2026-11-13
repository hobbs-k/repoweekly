// Renders scripts/og/card.html to public/og.png (1200x630), the picture shown when someone shares a link.
// Run by hand after changing the card: node scripts/og-image.js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openBrowser } from './lib/browser.js';

const b = await openBrowser();
try {
  await b.open(pathToFileURL(path.resolve('scripts/og/card.html')).href, { width: 1200, height: 630, settle: 800 });
  await b.screenshot('public/og.png');
  console.log('[og-image] wrote public/og.png');
} finally {
  b.close();
}
