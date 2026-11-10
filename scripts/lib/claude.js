import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in reply');
  return JSON.parse(text.slice(start, end + 1));
}

// One call that must return a JSON object. Retries once with the reason the first reply failed.
// shortcut: summarize.js keeps its own copy of this loop, merge them if a third caller appears.
export async function askJson({ system, user, validate, label, log, maxTokens = 2000 }) {
  const client = new Anthropic();
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNote = attempt ? `\n\nYour previous reply was rejected (${lastError}). Reply with only the JSON object.` : '';
    const msg = await client.messages.create({
      model: config.summarize.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user + retryNote }],
    });
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    try {
      return validate(extractJson(text));
    } catch (err) {
      lastError = err.message;
      log.warn(`${label}: bad reply (${lastError}), attempt ${attempt + 1} of 2`);
    }
  }
  throw new Error(`${label}: still bad after retry (${lastError})`);
}
