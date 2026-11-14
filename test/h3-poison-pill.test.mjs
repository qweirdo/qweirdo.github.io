import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class MockContext2D {
  constructor() {
    this.lineWidth = 1;
    this.strokeStyle = '';
    this.globalAlpha = 1;
    this.lineCap = '';
    this.lineJoin = '';
  }
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  quadraticCurveTo() {}
}

test('H3: Corrupted poison-pill primitives and strokes render without throwing', () => {
  const code = fs.readFileSync('I:/qweirdo.github.io/wall-live.js', 'utf8');

  const mockCtx = new MockContext2D();
  const mockQW = {
    X: mockCtx,
    drawAerosol: () => {},
    stampWildstyleBurner: () => {},
    stampBubbleSoftie: () => {},
    stampHandstyle: () => {},
    addDrip: () => {},
    SCHEMES: {
      gold: { stroke: '#b38600' }
    }
  };

  const sandbox = {
    window: {
      location: { hostname: 'localhost' },
      __QW: mockQW
    },
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    BroadcastChannel: class {
      constructor() {}
      postMessage() {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    fetch: async () => ({ ok: false }),
    setInterval: () => {},
    requestAnimationFrame: (cb) => cb()
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  assert.ok(typeof sandbox.window.__QW.renderWallPacket === 'function', 'renderWallPacket must be exposed on __QW');

  const poisonPacket1 = {
    id: 'qw_poison_1',
    scheme: '__proto__', // testing prototype key pollution
    aiPrimitives: [
      null,
      undefined,
      42,
      'string',
      { pts: 'x' },
      { pts: [[{}, {}]] },
      { type: 'unknown_type', pts: [[100, 100], [NaN, Infinity]] }
    ],
    bridgePrimitives: [
      null,
      { pts: null },
      { type: 'bezier', pts: [[10, 10]] } // invalid length for bezier
    ],
    strokes: [
      null,
      ['fat'], // too short
      ['fat', 'gold', NaN, undefined, 200, 200]
    ],
    customTag: '<script>evil()</script>',
    tagStyle: 'wildstyle',
    cx: 'invalid',
    cy: null
  };

  assert.doesNotThrow(() => {
    sandbox.window.__QW.renderWallPacket(poisonPacket1, false, 0.9);
    sandbox.window.__QW.renderWallPacket(poisonPacket1, true, 0.9);
  }, 'renderWallPacket must not throw when encountering corrupt poison-pill primitives');
});
