import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const studioPath = path.resolve('I:/qweirdo.github.io/studio.js');
const studioCode = fs.readFileSync(studioPath, 'utf8');

test('B1: drawOverlay function is defined and bridges to over()', () => {
  assert.match(
    studioCode,
    /function\s+drawOverlay\s*\(\s*\)\s*\{[\s\S]*?over\(\);?[\s\S]*?\}/,
    'studio.js must define drawOverlay() bridging to over()'
  );
});

test('B1: loadStampAsInteractiveStencil and unloadStencil execute without throwing drawOverlay ReferenceError', () => {
  let overCalled = 0;
  let rattleCalled = 0;
  let _msgText = '';

  const mockContext = {
    drawOverlay: () => { overCalled++; },
    playCanRattle: () => { rattleCalled++; },
    msg: (m) => { _msgText = m; },
    W: 1600,
    H: 800,
    activeStampStyle: 'pochoir',
    STAMP_MOTIFS: {
      penny_black: { name: 'Penny Black', w: 180, h: 220 }
    },
    STENCIL_DATA: {},
    activeStencil: null,
    stencilPos: null,
    stencilLocked: false,
    document: {
      getElementById: (_id) => ({
        style: {},
        classList: { remove: () => {} },
        textContent: ''
      })
    }
  };

  // Extract functions from studio.js
  const loadMatch = studioCode.match(/function\s+loadStampAsInteractiveStencil\s*\([\s\S]*?\n\}/);
  const unloadMatch = studioCode.match(/function\s+unloadStencil\s*\([\s\S]*?\n\}/);

  assert.ok(loadMatch, 'loadStampAsInteractiveStencil must be present in studio.js');
  assert.ok(unloadMatch, 'unloadStencil must be present in studio.js');

  const fnLoad = new Function('ctx', `
    with (ctx) {
      ${loadMatch[0]}
      return loadStampAsInteractiveStencil;
    }
  `)(mockContext);

  const fnUnload = new Function('ctx', `
    with (ctx) {
      ${unloadMatch[0]}
      return unloadStencil;
    }
  `)(mockContext);

  assert.doesNotThrow(() => {
    fnLoad('penny_black', 'QWEIRDO');
  }, 'loadStampAsInteractiveStencil must not throw');

  assert.equal(overCalled, 1, 'drawOverlay must have been called during load');
  assert.equal(rattleCalled, 1, 'playCanRattle must have been called during load');
  assert.equal(mockContext.activeStencil, 'custom_stamp');

  assert.doesNotThrow(() => {
    fnUnload();
  }, 'unloadStencil must not throw');

  assert.equal(overCalled, 2, 'drawOverlay must have been called during unload');
  assert.equal(mockContext.activeStencil, null);
});
