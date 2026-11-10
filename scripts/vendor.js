// Copies Chart.js into public/js/vendor so pages can load it as a plain external script.
// Usage: node scripts/vendor.js [--dry-run]
import fs from 'node:fs';
import { parseArgs } from './lib/args.js';
import { run } from './lib/logger.js';

await run('vendor', async (log) => {
  const dry = Boolean(parseArgs()['dry-run']);
  const from = 'node_modules/chart.js/dist/chart.umd.min.js';
  if (!fs.existsSync(from)) throw new Error(`${from} not found, run npm install`);
  if (!dry) {
    fs.mkdirSync('public/js/vendor', { recursive: true });
    fs.copyFileSync(from, 'public/js/vendor/chart.umd.min.js');
  }
  log.done(`chart.umd.min.js -> public/js/vendor${dry ? ' (dry run, nothing written)' : ''}`);
});
