import test from 'node:test';
import assert from 'node:assert/strict';
import { filterText, isBad } from '../src/filter.js';

test('M5/B3 Filter: Innocent words with substrings are never blocked', () => {
  const innocentList = [
    'grape',
    'peacock',
    'Dickens',
    'suspicious',
    'therapeutic',
    'Fukushima',
    'scrape',
    'crisis',
    'Isis',
    'Hitchcock',
    'spice',
    'swank',
    'grass',
    'compass',
    'Essex',
    'cucumber',
    'title',
    'attitude'
  ];

  for (const word of innocentList) {
    assert.equal(isBad(word), false, `Expected "${word}" to NOT be bad, but it was blocked.`);
    const res = filterText(word);
    assert.equal(res.ok, true, `Expected "${word}" filterText to be ok`);
  }
});

test('M5/B3 Filter: Non-Latin scripts (Bengali, Hindi, Cyrillic, Japanese, Arabic) are accepted', () => {
  const nonLatinWords = [
    'মেঘ',      // Bengali: cloud
    'নদী',     // Hindi: river
    'река',    // Cyrillic: river
    '川',      // Japanese: river
    'мир',     // Cyrillic: peace
    'سلام'     // Arabic: peace
  ];

  for (const word of nonLatinWords) {
    assert.equal(isBad(word), false, `Expected non-Latin word "${word}" to be accepted, but it was blocked.`);
    const res = filterText(word);
    assert.equal(res.ok, true, `Expected filterText("${word}") to be ok`);
  }
});

test('M5/B3 Filter: True abuse, slurs, and obscenities are strictly blocked', () => {
  const blockedList = [
    'fuck',
    'f*ck',
    'sh!t',
    'b!tch',
    'nigger',
    'n1gg3r',
    'whore',
    'cunt',
    'pussy',
    'asshole',
    'whitepower',
    'swastika',
    'alqaeda',
    'taliban',
    'burnquran'
  ];

  for (const word of blockedList) {
    assert.equal(isBad(word), true, `Expected harmful term "${word}" to be blocked.`);
    const res = filterText(word);
    assert.equal(res.ok, false, `Expected filterText("${word}") to return ok: false`);
  }
});

test('M5/B3 Filter: Cyrillic obscenities are blocked while innocent Cyrillic is allowed', () => {
  const cyrillicBad = ['хуй', 'пизда', 'ебать', 'блядь'];
  for (const word of cyrillicBad) {
    assert.equal(isBad(word), true, `Expected Cyrillic obscenity "${word}" to be blocked.`);
  }

  const cyrillicGood = ['река', 'мир', 'свет', 'книга', 'картина'];
  for (const word of cyrillicGood) {
    assert.equal(isBad(word), false, `Expected innocent Cyrillic "${word}" to pass.`);
  }
});

test('M5/B3 Filter: Auto-blocked sensitive terms per D2', () => {
  const d2Terms = ['fascism', 'holocaust', 'genocide', 'apartheid'];
  for (const term of d2Terms) {
    assert.equal(isBad(term), true, `Expected D2 sensitive term "${term}" to be auto-blocked.`);
  }
});

test('M5/B3 Filter: Array input and multi-word sentences', () => {
  assert.equal(filterText(['grape', 'peacock', 'river']).ok, true);
  assert.equal(filterText(['grape', 'fuck', 'river']).ok, false);
  assert.equal(isBad('I enjoy therapeutic art and fresh grape juice'), false);
  assert.equal(isBad('What a total asshole move'), true);
});
