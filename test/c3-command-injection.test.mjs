import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateOffering, inscribeOffering } from '../scripts/ingest-offering.mjs';

test('C3: Malicious contributor name with shell injection payload is strictly rejected', () => {
  const maliciousName = 'x"; touch INJECTED; echo "';
  const result = validateOffering({
    id: 101,
    words: ['moss', 'quiet'],
    name: maliciousName,
    link: ''
  });

  assert.equal(result.valid, false, 'Payload with quotes and semicolon must be rejected');
  assert.match(result.reason, /invalid characters/i);
});

test('C3: Malicious words with HTML or command substitution syntax are rejected', () => {
  const badWords = ['<img', '$(id)', '`whoami`', 'eval(1)', 'test;ls'];
  for (const w of badWords) {
    const res = validateOffering({
      id: 102,
      words: [w],
      name: 'Valid Scribe',
      link: ''
    });
    assert.equal(res.valid, false, `Word "${w}" must be rejected`);
  }
});

test('C3: Unit test confirms no shell side-effects (INJECTED file) occur in git commit step', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qweirdo-c3-test-'));
  const injectedFile = path.join(tmpDir, 'INJECTED');

  try {
    // Initialize a temporary git repository
    execFileSync('git', ['init'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'testbot'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'testbot@example.com'], { cwd: tmpDir });

    const editionFile = path.join(tmpDir, 'data', 'edition.json');
    const validOffering = {
      id: 77,
      words: ['amber', 'sanctuary'],
      name: 'Clean Scribe',
      link: 'https://example.com',
      ts: new Date().toISOString()
    };

    inscribeOffering(editionFile, validOffering, { commit: true, cwd: tmpDir });

    // Verify commit succeeded
    const log = execFileSync('git', ['log', '-n', '1', '--oneline'], { cwd: tmpDir }).toString();
    assert.match(log, /Inscribe offering #77/, 'Commit message must only include numeric ID');
    assert.ok(!log.includes('Clean Scribe'), 'Commit message must not contain user-provided name string');

    // Confirm no INJECTED file was created
    assert.equal(fs.existsSync(injectedFile), false, 'INJECTED file must not exist');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
