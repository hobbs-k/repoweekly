import { config } from './config.js';

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error(`no JSON object in reply: ${JSON.stringify(text.slice(0, 150))}`);
  return JSON.parse(text.slice(start, end + 1));
}

export function requireKey() {
  if (!process.env.LLM_API_KEY) throw new Error('LLM_API_KEY is not set');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One chat call to any OpenAI-style API (NVIDIA by default), returns the reply text.
// A rate-limited or busy server is retried a few times.
async function generate({ system, user, maxTokens }) {
  const body = JSON.stringify({
    model: config.summarize.model,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${config.summarize.apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body,
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(config.summarize.retryWaitMs * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`the AI service returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
}

// One call that must return a JSON object. Retries once with the reason the first reply failed.
export async function askJson({ system, user, validate, label, log, maxTokens = 2000 }) {
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNote = attempt ? `\n\nYour previous reply was rejected (${lastError}). Reply with only the JSON object.` : '';
    const text = await generate({ system, user: user + retryNote, maxTokens });
    try {
      return validate(extractJson(text));
    } catch (err) {
      lastError = err.message;
      log.warn(`${label}: bad reply (${lastError}), attempt ${attempt + 1} of 2`);
    }
  }
  throw new Error(`${label}: still bad after retry (${lastError})`);
}
