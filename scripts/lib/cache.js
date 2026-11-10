import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Returns null if the file does not exist; throws on invalid JSON.
export function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`invalid JSON in ${file}: ${err.message}`);
  }
}

// Two-space indent and a trailing newline, as DATA_SPEC.md requires.
export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function hashText(text) {
  return createHash('sha1').update(text).digest('hex');
}

// "owner/name" -> "owner__name"
export function summaryFileName(fullName) {
  return `${fullName.replace('/', '__')}.json`;
}
