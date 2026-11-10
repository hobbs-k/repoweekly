import { config } from './config.js';

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error(`no JSON object in reply: ${JSON.stringify(text.slice(0, 150))}`);
  return JSON.parse(text.slice(start, end + 1));
}

export function requireKey() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One Gemini call, returns the reply text. A rate-limited or busy model is retried, then the next model is tried.
async function generate({ system, user, maxTokens }) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens * 4, // room for the model's hidden thinking responseMimeType: 'application/json' },
  });
  let busy = '';
  for (const model of config.summarize.models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${config.summarize.apiBase}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body,
      });
      if (res.status === 429 || res.status >= 500) {
        busy = `${model} returned ${res.status}`;
        await sleep(config.summarize.retryWaitMs * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const cand = data.candidates?.[0];
      const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('');
      return text || `(empty, finishReason ${cand?.finishReason ?? 'none'}, blocked ${data.promptFeedback?.blockReason ?? 'no'})`;
    }
  }
  throw new Error(`every Gemini model was busy (${busy})`);
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
