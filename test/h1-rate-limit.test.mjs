import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as wallPost } from '../functions/api/wall.js';
import { onRequestPost as sketchPost } from '../functions/api/sketch.js';
import { getCorsHeaders, checkRateLimit, validateWallPiece } from '../functions/api/_validate.js';

test('H1: Oversized POST payload returns HTTP 413 Payload Too Large', async () => {
  const hugeBody = 'x'.repeat(40000);
  const req = new Request('https://qweirdo.pages.dev/api/wall', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '40000'
    },
    body: JSON.stringify({ huge: hugeBody })
  });

  const res = await wallPost({ request: req, env: {} });
  assert.equal(res.status, 413, 'Oversized wall payload must return 413');
});

test('H1: Origin-locked CORS restricts wildcard access', () => {
  const reqGood = new Request('https://qweirdo.pages.dev/api/wall', {
    headers: { Origin: 'https://qweirdo.github.io' }
  });
  const headersGood = getCorsHeaders(reqGood);
  assert.equal(headersGood['Access-Control-Allow-Origin'], 'https://qweirdo.github.io');

  const reqEvil = new Request('https://qweirdo.pages.dev/api/wall', {
    headers: { Origin: 'https://attacker.example.com' }
  });
  const headersEvil = getCorsHeaders(reqEvil);
  // Must NOT reflect the attacker origin
  assert.notEqual(headersEvil['Access-Control-Allow-Origin'], 'https://attacker.example.com');
});

test('H1: Rapid client requests hit the IP sliding rate limit and return 429', async () => {
  const testIp = '192.0.2.99';
  let allowed = 0;
  for (let i = 0; i < 25; i++) {
    if (checkRateLimit(testIp, 20, 60000)) allowed++;
  }
  assert.equal(allowed, 20, 'First 20 requests must pass');

  // 21st request must trigger 429 via wallPost
  const req = new Request('https://qweirdo.pages.dev/api/wall', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': testIp
    },
    body: JSON.stringify({ writer: 'Spammer' })
  });

  const res = await wallPost({ request: req, env: {} });
  assert.equal(res.status, 429, 'Excess requests must return status 429');
});

test('H2: Sketch endpoint rejects sensitive prompts and oversized bodies', async () => {
  const reqBadPrompt = new Request('https://qweirdo.pages.dev/api/sketch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'nazi hate swastika' })
  });
  const resBadPrompt = await sketchPost({ request: reqBadPrompt, env: {} });
  assert.equal(resBadPrompt.status, 400, 'Restricted prompt must return 400');

  const reqOversized = new Request('https://qweirdo.pages.dev/api/sketch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '20000'
    },
    body: JSON.stringify({ prompt: 'normal' })
  });
  const resOversized = await sketchPost({ request: reqOversized, env: {} });
  assert.equal(resOversized.status, 413, 'Sketch body over 16KB must return 413');
});

test('H3 Server: Strict schema validator drops prototype pollution and sanitizes unknown keys', () => {
  const hostileInput = {
    __proto__: { polluted: true },
    constructor: { prototype: { evil: true } },
    substrate: 'invalid_substrate',
    cap: 'invalid_cap',
    scheme: 'invalid_scheme',
    tagStyle: 'invalid_tag',
    unknownField: 'malicious_code',
    cx: 999999, // out of bounds
    cy: -500,   // out of bounds
    writer: '<script>evil()</script> Scribe',
    aiPrimitives: [
      null,
      { pts: 'invalid' },
      { type: 'poly', pts: [[100, 100], [200, 200]], width: 999 }
    ]
  };

  const outcome = validateWallPiece(hostileInput);
  assert.equal(outcome.valid, true);
  const piece = outcome.piece;

  assert.equal(piece.substrate, 'mta', 'Invalid substrate must fall back to safe default mta');
  assert.equal(piece.cap, 'fat', 'Invalid cap must fall back to safe default fat');
  assert.equal(piece.scheme, 'gold', 'Invalid scheme must fall back to safe default gold');
  assert.equal(piece.tagStyle, 'none', 'Invalid tagStyle must fall back to none');
  assert.equal(piece.cx, 1520, 'Out of bounds cx must be clamped');
  assert.equal(piece.cy, 80, 'Out of bounds cy must be clamped');
  assert.equal(piece.writer, 'Scribe', 'Writer HTML must be stripped');
  assert.equal(piece.unknownField, undefined, 'Unknown fields must be stripped');
  assert.equal(piece.aiPrimitives.length, 1, 'Invalid primitives must be dropped');
  assert.equal(piece.aiPrimitives[0].width, 6.0, 'Excessive width must be clamped');
});
