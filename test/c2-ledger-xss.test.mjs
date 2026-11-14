import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class MockElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.textContent_val = '';
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  appendChild(child) { this.children.push(child); }
  append(...children) { this.children.push(...children); }
  set innerHTML(val) {
    if (val === '') this.children = [];
  }
  set textContent(val) { this.textContent_val = val; }
  get textContent() { return this.textContent_val; }
  querySelectorAll(tag) {
    const res = [];
    const walk = (node) => {
      if (node.tagName === tag.toUpperCase()) res.push(node);
      node.children.forEach(walk);
    };
    walk(this);
    return res;
  }
}

test('C2: Ledger row with XSS payload renders strictly as literal text without DOM injection', async () => {
  const html = fs.readFileSync('I:/qweirdo.github.io/index.html', 'utf8');

  // Match async function loadEditionLedger
  const ledgerMatch = html.match(/async function loadEditionLedger\(\)[\s\S]*?\n\}/);
  assert.ok(ledgerMatch, 'async function loadEditionLedger must be present in index.html');

  const scrollMock = new MockElement('div');
  const mockDoc = {
    getElementById: (id) => {
      if (id === 'liveArchiveScroll') return scrollMock;
      return new MockElement('div');
    },
    createElement: (tag) => new MockElement(tag)
  };

  const maliciousName = '<img src=x onerror=alert(1)>';
  const maliciousWords = ['<script>alert(2)</script>', 'normal'];
  const testItems = [{
    id: '42<script>',
    words: maliciousWords,
    name: maliciousName,
    link: 'https://example.com'
  }];

  const sandbox = {
    document: mockDoc,
    fetch: async () => ({
      ok: true,
      json: async () => testItems
    }),
    activeEdition: [],
    Array,
    String,
    Number
  };

  vm.createContext(sandbox);
  vm.runInContext(ledgerMatch[0], sandbox);

  await sandbox.loadEditionLedger();

  // Assertions:
  // 1. scrollMock should have 1 child card
  assert.equal(scrollMock.children.length, 1, 'Card must be created');
  const card = scrollMock.children[0];

  // 2. No IMG or SCRIPT elements must exist inside the rendered card
  const imgElements = card.querySelectorAll('img');
  const scriptElements = card.querySelectorAll('script');
  assert.equal(imgElements.length, 0, 'No <img> elements must be instantiated from payload');
  assert.equal(scriptElements.length, 0, 'No <script> elements must be instantiated from payload');

  // 3. The card title and name must be literal textContent
  const textMatches = [];
  const collectText = (node) => {
    if (node.textContent_val) textMatches.push(node.textContent_val);
    node.children.forEach(collectText);
  };
  collectText(card);

  assert.ok(textMatches.includes(maliciousName), 'Malicious name must appear strictly as literal text string');
  assert.ok(textMatches.some(t => t.includes(maliciousWords[0])), 'Malicious word must appear strictly as literal text string');
});
