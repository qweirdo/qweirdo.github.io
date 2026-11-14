import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { validateEditionSchema } from '../scripts/check-schema.mjs';

test('Schema: data/edition.json strictly conforms to canonical offering schema', () => {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1'));
  const editionPath = path.resolve(scriptDir, '../data/edition.json');

  const res = validateEditionSchema(editionPath);
  assert.equal(res.ok, true);
  assert.ok(res.count >= 1, 'At least one offering must exist');
});
