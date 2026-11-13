// After each deploy, opens the live site in a real (headless) Chrome and checks that every key page
// actually shows its items to a visitor, including lists that page scripts build after loading.
// A failure fails the workflow, and GitHub emails the repo owner.
// Usage: node scripts/smoke.js   (SMOKE_URL or SITE_URL picks the site; defaults to config.site.url)
import { openBrowser } from './lib/browser.js';
import { config } from './lib/config.js';

const base = (process.env.SMOKE_URL || config.site.url).replace(/\/$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Counts elements a person can really see: rendered, not hidden, not faded out.
const seen = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((el) => {
  el.scrollIntoView({ block: 'center' });
  const s = getComputedStyle(el);
  return el.getClientRects().length > 0 && s.visibility !== 'hidden' && s.display !== 'none';
}).length`;
// Opacity is checked after the slide-in has had time to finish.
const solid = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((el) => Number(getComputedStyle(el).opacity) > 0.5).length`;

const CHECKS = [
  { name: 'home: the top 10', path: '/', sel: '.entries .entry', min: 10 },
  { name: 'skills: rising skill cards', path: '/skills/', sel: '.rising-entry', min: 1 },
  { name: 'skills: finder results', path: '/skills/', sel: '.skill-results .issue', min: 1 },
  { name: 'contribute: tickets', path: '/contribute/', sel: '.issues .issue', min: 1 },
  { name: 'terminal: answers a command', path: '/terminal/', sel: '.term-lines p', min: 4,
    before: `(() => { const i = document.querySelector('#term-in'); i.value = 'top --n 3'; i.form.requestSubmit(); })()` },
  { name: 'rising page loads', path: '/rising/', sel: 'main h1', min: 1 },
  { name: 'archive loads', path: '/weeks/', sel: 'main h1', min: 1 },
  { name: 'compare loads', path: '/compare/', sel: 'main h1', min: 1 },
];

async function runAll() {
  const b = await openBrowser();
  const failed = [];
  try {
    for (const c of CHECKS) {
      try {
        await b.open(`${base}${c.path}`);
        if (c.before) { await b.evaluate(c.before); await sleep(300); }
        await b.evaluate(seen(c.sel));
        await sleep(900);
        const n = await b.evaluate(solid(c.sel));
        console.log(`${n >= c.min ? 'ok  ' : 'FAIL'} ${c.name}: ${n} visible (need ${c.min})`);
        if (n < c.min) failed.push(c.name);
      } catch (err) {
        console.log(`FAIL ${c.name}: ${err.message}`);
        failed.push(c.name);
      }
    }
  } finally {
    b.close();
  }
  return failed;
}

// GitHub Pages can serve the old copy for a minute after a deploy, so a failure is retried twice.
let failed = [];
for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`[smoke] ${base}, attempt ${attempt}`);
  failed = await runAll();
  if (!failed.length) break;
  if (attempt < 3) await sleep(45000);
}
if (failed.length) {
  console.error(`[smoke] FAILED: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('[smoke] every page shows its items');
