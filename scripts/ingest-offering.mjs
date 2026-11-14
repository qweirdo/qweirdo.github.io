import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isBad } from '../src/filter.js';

export const WORD_REGEX = /^[\p{L}\p{M}\p{N}'’-]{1,24}$/u;
export const NAME_REGEX = /^[\p{L}\p{M}\p{N} .,'’_-]{1,40}$/u;

export const isBadTerm = isBad;

export function parseOffering(body) {
  if (typeof body !== 'string') return { words: [], name: '', link: '' };

  function getField(label) {
    const regex = new RegExp(`###\\s*${label}\\s*\\r?\\n\\r?\\n([^#]+)`, 'i');
    const match = body.match(regex);
    return match ? match[1].trim() : '';
  }

  const rawWords = getField('Five Words');
  const rawName = getField('Display Name');
  const rawLink = getField('Optional Link');

  const words = rawWords.split(/\s+/).filter(Boolean);
  const name = rawName || '';
  const link = (rawLink === '_No response_' ? '' : rawLink).trim();

  return { words, name, link };
}

export function validateOffering(obj) {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, reason: 'Offering payload is empty or invalid.' };
  }

  const id = Number(obj.id);
  if (!Number.isFinite(id) || id <= 0) {
    return { valid: false, reason: 'Invalid issue number identifier.' };
  }

  const words = Array.isArray(obj.words) ? obj.words : [];
  if (words.length < 1 || words.length > 5) {
    return { valid: false, reason: `Must contain between 1 and 5 words (found ${words.length}).` };
  }

  for (const w of words) {
    if (!WORD_REGEX.test(w)) {
      return { valid: false, reason: `Word "${w}" contains invalid characters or exceeds 24 characters.` };
    }
    if (isBadTerm(w)) {
      return { valid: false, reason: 'Offering contains restricted or sensitive terms.' };
    }
  }

  let cleanName = 'Anonymous Scribe';
  if (obj.name && obj.name.trim()) {
    const trimmed = obj.name.trim();
    if (!NAME_REGEX.test(trimmed)) {
      return { valid: false, reason: `Display name contains invalid characters or exceeds 40 characters.` };
    }
    if (trimmed.split(/\s+/).some(isBadTerm)) {
      return { valid: false, reason: 'Display name contains restricted or sensitive terms.' };
    }
    cleanName = trimmed;
  }

  let cleanLink = '';
  if (obj.link && obj.link.trim()) {
    try {
      const u = new URL(obj.link.trim());
      if (u.protocol !== 'https:') {
        return { valid: false, reason: 'Optional link must use secure https:// protocol.' };
      }
      if (u.username || u.password) {
        return { valid: false, reason: 'Optional link must not contain user credentials.' };
      }
      if (u.href.length > 200) {
        return { valid: false, reason: 'Optional link URL exceeds 200 characters limit.' };
      }
      cleanLink = u.href;
    } catch {
      return { valid: false, reason: 'Optional link is not a valid URL.' };
    }
  }

  return {
    valid: true,
    offering: {
      id,
      words,
      name: cleanName,
      link: cleanLink,
      ts: obj.ts || new Date().toISOString()
    }
  };
}

export function inscribeOffering(editionFilePath, offering, options = {}) {
  const dir = path.dirname(editionFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let edition = [];
  if (fs.existsSync(editionFilePath)) {
    try {
      edition = JSON.parse(fs.readFileSync(editionFilePath, 'utf8'));
    } catch {
      edition = [];
    }
  }
  if (!Array.isArray(edition)) edition = [];

  const existingIdx = edition.findIndex(e => e.id === offering.id);
  if (existingIdx >= 0) {
    edition[existingIdx] = offering;
  } else {
    edition.push(offering);
  }

  fs.writeFileSync(editionFilePath, JSON.stringify(edition, null, 2) + '\n', 'utf8');

  if (options.commit) {
    const cwd = options.cwd || process.cwd();
    execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { cwd });
    execFileSync('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], { cwd });
    execFileSync('git', ['add', editionFilePath], { cwd });
    execFileSync('git', ['commit', '-m', `Inscribe offering #${Number(offering.id)}`], { cwd });
    if (options.push) {
      execFileSync('git', ['push'], { cwd });
    }
  }

  return edition;
}
