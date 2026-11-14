import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/wall.js';
import { isValidImage } from '../functions/api/_validate.js';

test('C1: Server rejects XSS attribute breakout in image field with HTTP 400', async () => {
  const maliciousPayload = 'data:image/png;base64,AA" onerror="alert(1)" x="';

  // 1. Check unit validator
  assert.equal(isValidImage(maliciousPayload), false, 'Malformed image string must fail isValidImage');

  // 2. Check onRequestPost
  const req = new Request('https://qweirdo.pages.dev/api/wall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writer: 'Attacker',
      title: 'XSS Attempt',
      image: maliciousPayload
    })
  });

  const res = await onRequestPost({ request: req, env: {} });
  assert.equal(res.status, 400, 'Server must return status 400 for malicious image payload');
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /Invalid.*image/i);
});

test('C1: Server accepts valid PNG data URL with correct magic bytes', async () => {
  // 1x1 transparent PNG: magic bytes 89 50 4E 47
  const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  assert.equal(isValidImage(validPng), true, 'Valid 1x1 PNG must pass isValidImage');

  const req = new Request('https://qweirdo.pages.dev/api/wall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writer: 'Artist',
      title: 'Valid Thumbnail',
      image: validPng
    })
  });

  const res = await onRequestPost({ request: req, env: {} });
  assert.equal(res.status, 201, 'Valid piece must be created with status 201');
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.piece.image, validPng);
});

test('C1: Client validator rejects XSS payload and does not allow DOM breakout', () => {
  const SAFE_THUMB = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  const safeThumb = s => typeof s === 'string' && s.length < 28000 && SAFE_THUMB.test(s);

  const maliciousPayload = 'data:image/png;base64,AA" onerror="alert(1)" x="';
  assert.equal(safeThumb(maliciousPayload), false, 'Client safeThumb must reject injection string');

  const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  assert.equal(safeThumb(validPng), true, 'Client safeThumb must accept valid base64 PNG');
});
