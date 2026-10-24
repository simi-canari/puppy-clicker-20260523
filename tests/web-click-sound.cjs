// Run with: node --test tests/web-click-sound.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const tick = () => new Promise(setImmediate);

function setup() {
  const contexts = [];
  const errors = [];
  let fetches = 0;
  let decodes = 0;
  let now = 0;
  let stalled = false;
  let finishResume;
  class Context {
    state = 'suspended';
    sources = [];
    destination = {};
    constructor() { contexts.push(this); }
    resume() {
      if (stalled) return new Promise(resolve => {
        finishResume = () => { this.state = 'running'; resolve(); };
      });
      this.state = 'running';
      return Promise.resolve();
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData() { decodes++; return Promise.resolve({ decoded: true }); }
    createBufferSource() {
      const source = {
        stopped: false, started: false,
        connect() {}, disconnect() {},
        start(offset) { assert.equal(offset, 0); this.started = true; },
        stop() { this.stopped = true; },
      };
      this.sources.push(source);
      return source;
    }
  }
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(require.resolve('../useClickSound.web.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  vm.runInNewContext(code, {
    exports, AudioContext: Context, Date: { now: () => now },
    fetch: async () => { fetches++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) }; },
    require: name => {
      if (name === 'expo-asset') return { Asset: { fromModule: () => ({ uri: '/click.mp3' }) } };
      if (name === 'react') return {};
      if (name.endsWith('.mp3')) return 1;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    sound: new exports.WebClickSound(error => errors.push(error)), contexts, errors,
    stats: () => ({ fetches, decodes }),
    stall: () => { stalled = true; },
    recover: () => { stalled = false; now = 2000; },
    finish: () => finishResume(),
  };
}

test('preloads once and replaces each click using the same decoded buffer', async () => {
  const { sound, contexts, stats } = setup();
  sound.preload();
  await tick();
  assert.equal(contexts[0].state, 'suspended');
  sound.press();
  await tick();
  const first = contexts[0].sources[0];
  sound.press();
  assert.equal(first.stopped, true);
  await tick();
  assert.equal(contexts[0].sources.length, 2);
  assert.equal(first.buffer, contexts[0].sources[1].buffer);
  assert.deepEqual(stats(), { fetches: 2, decodes: 2 });
  sound.dispose();
});

test('rapid taps during preparation play only the latest tap', async () => {
  const { sound, contexts } = setup();
  sound.press(); sound.press(); sound.press();
  await tick();
  assert.equal(contexts[0].sources.length, 1);
  sound.dispose();
});

test('backgrounding and disposal cancel pending clicks', async () => {
  const { sound, contexts } = setup();
  sound.press(); sound.interrupt();
  await tick();
  assert.equal(contexts[0].sources.length, 0);
  sound.press(); sound.dispose();
  await tick();
  assert.equal(contexts[0].sources.length, 0);
});

test('a stalled resume is replaced on a later tap without replaying the old one', async () => {
  const fixture = setup();
  fixture.sound.preload();
  await tick();
  fixture.stall(); fixture.sound.press();
  fixture.recover(); fixture.sound.press();
  await tick();
  assert.equal(fixture.contexts.length, 2);
  assert.equal(fixture.contexts[1].sources.length, 1);
  fixture.finish();
  await tick();
  assert.equal(fixture.contexts[0].sources.length, 0);
  assert.deepEqual(fixture.stats(), { fetches: 2, decodes: 2 });
  fixture.sound.dispose();
});

test('an early release waits for click in, then plays click out only once', async () => {
  const { sound, contexts } = setup();
  sound.press();
  sound.release();
  await tick();
  const context = contexts[0];
  assert.equal(context.sources.length, 1);
  const press = context.sources[0];
  press.onended();
  assert.equal(context.sources.length, 2);
  assert.notEqual(context.sources[1].buffer, press.buffer);
  sound.release();
  assert.equal(context.sources.length, 2);
  context.sources[1].onended();
  sound.release();
  assert.equal(context.sources.length, 2);
  sound.dispose();
});

test('holding waits silently after click in until release', async () => {
  const { sound, contexts } = setup();
  sound.press();
  await tick();
  const context = contexts[0];
  context.sources[0].onended();
  assert.equal(context.sources.length, 1);
  sound.release();
  assert.equal(context.sources.length, 2);
  sound.dispose();
});

test('a new press cancels queued release and ignores an old completion', async () => {
  const { sound, contexts } = setup();
  sound.press();
  await tick();
  const context = contexts[0];
  const old = context.sources[0];
  const oldEnd = old.onended;
  sound.release();
  sound.press();
  assert.equal(old.stopped, true);
  oldEnd();
  await tick();
  assert.equal(context.sources.length, 2);
  context.sources[1].onended();
  assert.equal(context.sources.length, 2);
  sound.release();
  assert.equal(context.sources.length, 3);
  const release = context.sources[2];
  sound.press();
  assert.equal(release.stopped, true);
  await tick();
  assert.equal(context.sources.length, 4);
  assert.equal(context.sources[3].buffer, old.buffer);
  sound.dispose();
});
