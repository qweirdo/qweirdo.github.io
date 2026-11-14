// Project Qweirdo: Unified Token-Based Unicode Abuse & Profanity Filter
// Zero-dependency ES module for browser (studio.js), server (Functions), and workflows

// Innocent false-positive allowlist (terms containing short substrings like rape, cock, dick, spic, isis, etc.)
export const INNOCENT_WORDS = new Set([
  'grape', 'grapes', 'grapefruit', 'grapevine',
  'peacock', 'peacocks',
  'dickens', 'dickensian',
  'suspicious', 'suspiciously', 'suspicion', 'suspicions',
  'therapeutic', 'therapeutics', 'therapy', 'therapies', 'therapist', 'therapists',
  'fukushima',
  'scrape', 'scrapes', 'scraped', 'scraping', 'scraper', 'scrapers',
  'crisis', 'crises',
  'isis', // Egyptian goddess / River Isis
  'hitchcock',
  'spice', 'spices', 'spicy',
  'swank', 'swanky',
  // Common harmless words with 'ass' substring
  'grass', 'class', 'classes', 'classic', 'classical', 'bass', 'compass', 'mass',
  'passage', 'passion', 'passionate', 'passive', 'asset', 'assets', 'assemble',
  'assembly', 'assert', 'assertion', 'assist', 'assistance', 'assistant', 'glass',
  'glasses', 'brass',
  // Harmless words with 'cum' substring
  'circumstance', 'circumstances', 'cumulative', 'cucumber', 'succumb', 'document', 'documents',
  // Harmless words with 'tit' substring
  'title', 'titles', 'entity', 'entities', 'attitude', 'attitudes', 'quantity', 'appetite', 'petition',
  // Harmless words with 'sex' substring
  'essex', 'sussex', 'middlesex', 'sextant',
  // Harmless words with 'cock' substring
  'cocktail', 'cocktails', 'cockpit', 'cockatoo', 'weathercock',
  // Harmless words with 'rape' substring
  'parapet', 'trapeze', 'serape'
]);

// Exact token blocklist: harmful terms that should ONLY match as full tokens or with standard inflections,
// never as unrestricted substrings inside innocent words.
export const EXACT_BAD_ROOTS = new Set([
  'ass', 'asses',
  'sex', 'sexy',
  'cum', 'cums', 'cumming',
  'tit', 'tits', 'titty', 'titties',
  'piss', 'pisses', 'pissed', 'pissing',
  'dick', 'dicks',
  'cock', 'cocks',
  'rape', 'rapes', 'rapist', 'rapists', 'raping',
  'spic', 'spics',
  'wank', 'wanks', 'wanker', 'wankers', 'wanking',
  'twat', 'twats',
  'fuk', 'fuks', 'fck', 'fcks',
  'gook', 'gooks',
  'kike', 'kikes',
  'chink', 'chinks'
]);

// Substring/stem blocklist: explicit slurs, violent extremism, and severely abusive stems.
// These are specific enough to match as stems/substrings unless explicitly allowlisted.
export const SUBSTRING_BAD_ROOTS = [
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'asshole', 'whore', 'slut',
  'retard', 'porn', 'nigg', 'fag', 'faggot', 'nazi', 'hitler', 'swastik',
  'aryan', 'whitepower', 'kkk', 'gestapo', 'burnquran', 'burnbible',
  'kaffir', 'kafir', 'infidel', 'alqaeda', 'taliban', 'daesh', 'boko',
  'hezbollah', 'dhimmi',
  // Auto-blocked sensitive terms per D2
  'fascis', 'holocaust', 'apartheid', 'genocid', 'jihad'
];

// Cyrillic profanity stems
export const CYRILLIC_BAD_ROOTS = [
  'хуй', 'хуя', 'хуе', 'хуи',
  'пизд',
  'ебат', 'ебан', 'ебал', 'ёб',
  'бляд', 'блят',
  'сука', 'сучк'
];

/**
 * Normalizes leetspeak and common vowel obfuscations before character stripping.
 */
export function normalizeLeetspeak(str) {
  if (!str) return '';
  return str
    .normalize('NFKC')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/8/g, 'b')
    .replace(/7/g, 't')
    .replace(/\*/g, 'u');
}

/**
 * Strips non-alphanumeric punctuation while strictly preserving all Unicode letters (\p{L}),
 * marks (\p{M}), and numbers (\p{N}).
 */
export function stripPunctuation(str) {
  if (!str) return '';
  return str.replace(/[^\p{L}\p{M}\p{N}]/gu, '');
}

/**
 * Checks a single raw token against the filter rules.
 * Returns { ok: boolean, reason?: string, term?: string }
 */
export function evaluateToken(rawToken) {
  if (!rawToken) return { ok: true };

  const rawLower = String(rawToken).normalize('NFKC').toLowerCase();
  const rawClean = stripPunctuation(rawLower);

  // 1. Fast path: Innocent allowlist check
  if (INNOCENT_WORDS.has(rawLower) || INNOCENT_WORDS.has(rawClean)) {
    return { ok: true };
  }

  // 2. Check Cyrillic profanities
  for (const root of CYRILLIC_BAD_ROOTS) {
    if (rawLower.includes(root) || rawClean.includes(root)) {
      return { ok: false, reason: 'Restricted term detected', term: root };
    }
  }

  // 3. Normalize leetspeak and evaluate
  const leet = normalizeLeetspeak(rawLower);
  const leetClean = stripPunctuation(leet);

  // Check innocent allowlist again on leet-normalized form
  if (INNOCENT_WORDS.has(leet) || INNOCENT_WORDS.has(leetClean)) {
    return { ok: true };
  }

  // 4. Exact token matching
  if (EXACT_BAD_ROOTS.has(rawClean) || EXACT_BAD_ROOTS.has(leetClean)) {
    return { ok: false, reason: 'Restricted term detected', term: rawClean };
  }

  // 5. Substring root matching (for slurs, extreme hate, violent extremism)
  for (const root of SUBSTRING_BAD_ROOTS) {
    if (rawClean.includes(root) || leetClean.includes(root)) {
      return { ok: false, reason: 'Restricted term detected', term: root };
    }
  }

  // Word is clean (including any non-Latin innocent words like মেঘ, नदी, река, 川)
  return { ok: true };
}

/**
 * Validates text or array of words.
 * Returns { ok: boolean, reason: string | null, review: boolean, blockedTerms: string[] }
 */
export function filterText(input) {
  if (!input) return { ok: true, reason: null, review: false, blockedTerms: [] };

  let rawList = [];
  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    // Check deobfuscated single letters like "f u c k"
    const deobfuscated = input.replace(/\b([a-z0-9])\s+([a-z0-9])\s+([a-z0-9])\b/gi, '$1$2$3');
    rawList = (deobfuscated + ' ' + input).trim().split(/\s+/).filter(Boolean);
  } else {
    rawList = [String(input)];
  }

  const blockedTerms = [];
  for (const token of rawList) {
    const result = evaluateToken(token);
    if (!result.ok) {
      blockedTerms.push(result.term || token);
    }
  }

  if (blockedTerms.length > 0) {
    return {
      ok: false,
      reason: 'Restricted term detected: ' + blockedTerms.join(', '),
      review: false, // Per D2, auto-block
      blockedTerms
    };
  }

  return {
    ok: true,
    reason: null,
    review: false,
    blockedTerms: []
  };
}

/**
 * Drop-in boolean helper. Returns true if text contains restricted terms, false otherwise.
 */
export function isBad(input) {
  return !filterText(input).ok;
}
