// Posts the latest week to Telegram, Discord and a Buttondown email. A channel without its
// credentials is skipped. data/notified.json remembers what was sent, so a rerun never posts twice.
// Usage: node scripts/notify.js [--dry-run] [--week YYYY-Www]
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';
import { formatRange, weekNumber } from './lib/weeks.js';

const env = process.env;
const trim = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

// The full text if it fits, otherwise names and gains only.
function compose(w, maxLen) {
  const url = `${config.site.url}/weeks/${w.week}/`;
  const head = `RepoWeekly, week ${weekNumber(w.week)} of ${w.start.slice(0, 4)} (${formatRange(w.start, w.end)})`;
  const build = (line) => [head, '', ...w.top.map(line), '', `Full ranking: ${url}`].join('\n');
  const full = build((i) => `${i.rank}. ${i.full_name} (+${i.stars_gained}): ${trim(i.summary.what_it_is, 110)}`);
  return full.length <= maxLen ? full : build((i) => `${i.rank}. ${i.full_name} (+${i.stars_gained})`);
}

async function post(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
}

await run('notify', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const week = args.week || readJson(config.paths.latest)?.week;
  const w = week && readJson(path.join(config.paths.weeks, `${week}.json`));
  if (!w) throw new Error('latest week not found, run rank.js first');
  if (w.top.some((i) => !i.summary)) throw new Error(`${week} has items without summaries, not posting`);

  const jsonHeaders = { 'Content-Type': 'application/json' };
  const channels = {
    telegram: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && (() =>
      post(`${env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: compose(w, 4000), disable_web_page_preview: true }),
      })),
    discord: env.DISCORD_WEBHOOK_URL && (() => {
      if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(env.DISCORD_WEBHOOK_URL) && !env.DISCORD_ALLOW_ANY_URL) throw new Error('DISCORD_WEBHOOK_URL is not a Discord webhook address');
      return post(env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ content: compose(w, 1900) }) });
    }),
    email: env.BUTTONDOWN_API_KEY && (() =>
      post(`${env.BUTTONDOWN_API_BASE || 'https://api.buttondown.email'}/v1/emails`, {
        method: 'POST', headers: { ...jsonHeaders, Authorization: `Token ${env.BUTTONDOWN_API_KEY}` },
        body: JSON.stringify({ subject: `RepoWeekly: week ${weekNumber(w.week)} of ${w.start.slice(0, 4)}`, body: compose(w, 20000), status: 'about_to_send' }),
      })),
  };

  const file = path.join(config.paths.data, 'notified.json');
  const sent = readJson(file) ?? {};
  const done = new Set(sent[week] ?? []);
  const failed = [];
  let posted = 0;

  for (const [name, send] of Object.entries(channels)) {
    if (!send) { log.log(`${name}: not configured, skipped`); continue; }
    if (done.has(name)) { log.log(`${name}: already sent for ${week}, skipped`); continue; }
    if (dry) { log.log(`${name}: would send\n${compose(w, name === 'discord' ? 1900 : 4000)}`); continue; }
    try {
      await send();
      done.add(name);
      sent[week] = [...done];
      writeJson(file, sent); // saved after each success so a later failure cannot cause a repeat
      posted++;
      log.log(`${name}: sent`);
    } catch (err) {
      failed.push(name);
      log.warn(`${name}: ${err.message}`);
    }
  }
  if (failed.length) throw new Error(`failed: ${failed.join(', ')}`);
  log.done(`${posted} sent for ${week}${dry ? ' (dry run, nothing sent)' : ''}`);
});
