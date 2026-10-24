const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(device) {
  const exports = {};
  let supported = false;
  let cleanup;
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../useSilentMode.web.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, navigator: device,
    require: () => ({
      useState: () => [supported, value => { supported = value; }],
      useEffect: effect => { cleanup = effect(); },
    }),
  });
  return { ...exports, supported: () => supported, cleanup: () => cleanup?.() };
}

test('iPhone toggles playback/auto and restores the previous session on cleanup', () => {
  const session = { type: 'auto' };
  const hooks = setup({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5, audioSession: session });
  hooks.useSilentMode(true);
  assert.equal(session.type, 'playback');
  assert.equal(hooks.supported(), true);
  hooks.cleanup();
  assert.equal(session.type, 'auto');
  hooks.useSilentMode(false);
  assert.equal(session.type, 'auto');
});

test('desktop-mode iPad is detected; Android and desktop remain untouched', () => {
  for (const [platform, userAgent, maxTouchPoints, expected] of [
    ['MacIntel', 'Macintosh', 5, true],
    ['MacIntel', 'Macintosh', 0, false],
    ['Linux armv8l', 'Android', 5, false],
    ['Win32', 'Windows', 0, false],
  ]) {
    const session = { type: 'auto' };
    const hooks = setup({ platform, userAgent, maxTouchPoints, audioSession: session });
    hooks.useSilentMode(true);
    assert.equal(hooks.supported(), expected);
    assert.equal(session.type, expected ? 'playback' : 'auto');
  }
});

test('unsupported or rejected APIs leave the option hidden', () => {
  const device = { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 };
  const unsupported = setup(device);
  unsupported.useSilentMode(true);
  assert.equal(unsupported.supported(), false);
  const rejected = setup({ ...device, audioSession: {
    get type() { return 'auto'; }, set type(_) { throw new Error('Unavailable'); },
  } });
  rejected.useSilentMode(true);
  assert.equal(rejected.supported(), false);
});
