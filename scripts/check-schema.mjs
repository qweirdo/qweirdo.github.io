import fs from 'node:fs';
import path from 'node:path';

export function validateEditionSchema(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Edition file does not exist: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Malformed JSON in ${filePath}: ${err.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`Schema violation: ${filePath} root must be an Array`);
  }

  const seenIds = new Set();
  const WORD_REGEX = /^[\p{L}\p{M}\p{N}'’-]{1,24}$/u;

  data.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Item at index ${idx} is not an object`);
    }

    if (!Number.isInteger(item.id) || item.id <= 0) {
      throw new Error(`Item at index ${idx} has invalid id: ${item.id}`);
    }

    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate offering id detected: ${item.id}`);
    }
    seenIds.add(item.id);

    if (!Array.isArray(item.words) || item.words.length < 1 || item.words.length > 5) {
      throw new Error(`Item ${item.id} must have 1 to 5 words`);
    }

    item.words.forEach((w) => {
      if (typeof w !== 'string' || !WORD_REGEX.test(w)) {
        throw new Error(`Item ${item.id} has invalid word: "${w}"`);
      }
    });

    if (typeof item.name !== 'string' || item.name.length > 60) {
      throw new Error(`Item ${item.id} has invalid name`);
    }

    if (item.link) {
      if (typeof item.link !== 'string' || (!item.link.startsWith('https://') && !item.link.startsWith('http://'))) {
        throw new Error(`Item ${item.id} has invalid link URL: "${item.link}"`);
      }
    }

    if (!item.ts || Number.isNaN(Date.parse(item.ts))) {
      throw new Error(`Item ${item.id} has invalid timestamp: "${item.ts}"`);
    }
  });

  return { ok: true, count: data.length };
}

// CLI invocation
const defaultPath = path.resolve('data/edition.json');
const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'));
const repoPath = path.resolve(scriptDir, '../data/edition.json');
const editionPath = fs.existsSync(defaultPath) ? defaultPath : repoPath;
try {
  const res = validateEditionSchema(editionPath);
  console.log(`✓ Edition schema valid: ${res.count} offerings verified in ${editionPath}`);
} catch (err) {
  console.error(`✗ Schema check failed: ${err.message}`);
  process.exit(1);
}
