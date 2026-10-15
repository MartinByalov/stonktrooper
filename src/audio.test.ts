// Regression checks for audio.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { sound, SoundController } from './audio';
import { SOUND_CATEGORIES, SOUND_VARIANTS } from './soundSettings';

test('Live Feed has no news sound or sound-menu category', () => {
  assert(!SOUND_CATEGORIES.some(({ id }) => String(id) === 'news'));
  assert(!('news' in new SoundController().settings));
  assert(!('playNewsAlert' in SoundController.prototype));
  const game = readFileSync(new URL('./CandleGame.tsx', import.meta.url), 'utf8');
  const newsTrigger = game.slice(game.indexOf('const triggerSyntheticNews ='), game.indexOf('const updateEntities ='));
  assert.match(newsTrigger, /g\.tickerQueue\.push/);
  assert.doesNotMatch(newsTrigger, /sound\./, 'headlines update the feed silently');
});

test('music timer stops on pause and mute and resumes only during play', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalClear = globalThis.clearInterval;
  let active = 0;
  let nextId = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    setInterval: () => { active++; return ++nextId; },
  } });
  globalThis.clearInterval = (() => { active--; }) as typeof clearInterval;
  try {
    sound.enabled = true;
    sound.setPlaying(true);
    assert.equal(active, 1);
    sound.setPlaying(true);
    assert.equal(active, 1);
    sound.setPlaying(false);
    assert.equal(active, 0);
    sound.enabled = false;
    sound.setPlaying(true);
    assert.equal(active, 0);
    sound.enabled = true;
    assert.equal(active, 1);
    sound.enabled = false;
    assert.equal(active, 0);
    sound.setPlaying(false);
    sound.enabled = true;
    assert.equal(active, 0);
  } finally {
    sound.setPlaying(false);
    globalThis.clearInterval = originalClear;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('unlocked audio schedules music and all four enemies, but not while paused', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalClear = globalThis.clearInterval;
  let tick = () => {};
  let starts = 0;
  let resumes = 0;
  const parameter = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
  const node = () => ({ connect() {}, disconnect() {}, start() { starts++; }, stop() {}, frequency: parameter, gain: parameter, Q: parameter });
  class MockAudioContext {
    state = 'suspended';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    resume() { resumes++; this.state = 'running'; return Promise.resolve(); }
    createOscillator = node;
    createGain = node;
    createBiquadFilter = node;
    createBufferSource = node;
    createBuffer(_channels: number, size: number) { return { getChannelData: () => new Float32Array(size) }; }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    AudioContext: MockAudioContext,
    setInterval: (callback: () => void) => { tick = callback; return 1; },
  } });
  globalThis.clearInterval = (() => {}) as typeof clearInterval;
  const controller = new SoundController();
  try {
    controller.unlock();
    assert.equal(resumes, 1);
    controller.setPlaying(true);
    tick();
    assert(starts > 0, 'background music schedules audible sources');
    for (const type of ['bull', 'bear', 'whale', 'swan', 'bat', 'chainsaw'] as const) {
      const before = starts;
      controller.playEnemy(type);
      assert(starts > before, `${type} schedules sound sources`);
      const after = starts;
      controller.playEnemy(type);
      assert.equal(starts, after, 'cooldown prevents every-frame sounds');
    }
    for (const play of [() => controller.playPigeonDrop(), () => controller.playPigeonSplat(), () => controller.playFall(), () => controller.playBriefcaseThrow(), () => controller.playFedoraThrow(), () => controller.playFedoraFly(), () => controller.playFedoraHit(), () => controller.playBananaThrow(), () => controller.playGameOver()]) {
      const before = starts;
      play();
      assert(starts > before, 'throw and game-over effects schedule sound');
    }
    controller.setPlaying(false);
    const before = starts;
    tick();
    controller.playEnemy('swan');
    assert.equal(starts, before);
    controller.preview('banana');
    assert(starts > before, 'preview works while the game is paused');
    controller.selectSound('banana', 'off');
    const mutedStarts = starts;
    controller.preview('banana');
    assert.equal(starts, mutedStarts, 'category Off blocks preview');
    controller.selectSound('banana', 'arcade');
    controller.preview('banana');
    assert(starts > mutedStarts, 'alternative preset schedules sound');
    controller.selectSound('music', 'off');
    const silentMusic = starts;
    controller.setPlaying(true);
    tick();
    assert.equal(starts, silentMusic, 'music Off blocks the music callback');
    controller.setPlaying(false);
    for (const variant of SOUND_VARIANTS.filter(value => value !== 'off')) {
      for (const { id } of SOUND_CATEGORIES.filter(item => item.id !== 'music')) {
        controller.selectSound(id, variant);
        const before = starts;
        controller.preview(id);
        assert(starts > before, `${id}/${variant} produces sound`);
      }
      controller.selectSound('music', variant);
      controller.setPlaying(true);
      const before = starts;
      tick();
      assert(starts > before, `music/${variant} produces sound`);
      controller.setPlaying(false);
    }
  } finally {
    controller.setPlaying(false);
    globalThis.clearInterval = originalClear;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('fedora effects are distinct from briefcase, throttle flight, and obey sound settings', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const frequencies: number[] = [];
  let starts = 0;
  const parameter = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
  const node = () => ({ connect() {}, disconnect() {}, start() { starts++; }, stop() {}, frequency: parameter, gain: parameter, Q: parameter });
  class MockAudioContext {
    currentTime = 1;
    sampleRate = 8000;
    destination = {};
    createOscillator() {
      return { ...node(), frequency: { ...parameter, setValueAtTime: (value: number) => { frequencies.push(value); } } };
    }
    createGain = node;
    createBiquadFilter = node;
    createBufferSource = node;
    createBuffer(_channels: number, size: number) { return { getChannelData: () => new Float32Array(size) }; }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: MockAudioContext } });
  const controller = new SoundController();
  controller.settings.music = 'off';
  try {
    controller.setPlaying(true);
    controller.playBriefcaseThrow();
    assert(frequencies.includes(160));
    controller.playFedoraThrow();
    assert(frequencies.includes(350));
    assert(frequencies.indexOf(350) > frequencies.indexOf(160));
    controller.playFedoraHit();
    assert(frequencies.includes(690));
    controller.playFedoraFly();
    assert(frequencies.includes(570));
    const afterFirstFly = starts;
    controller.playFedoraFly();
    assert.equal(starts, afterFirstFly, 'flight is not repeated every frame');
    const ctx = (controller as unknown as { ctx: MockAudioContext }).ctx;
    ctx.currentTime += 0.43;
    controller.playFedoraFly();
    assert(starts > afterFirstFly, 'flight resumes after its cooldown');
    const beforeBag = frequencies.length;
    controller.playBag();
    assert(frequencies.slice(beforeBag).includes(125), 'bag uses a low heavy thud');
    assert(!frequencies.slice(beforeBag).includes(987.77), 'bag does not use the coin chime');
    const beforeTender = frequencies.length;
    controller.playTender();
    assert(frequencies.slice(beforeTender).includes(460), 'tender uses a throaty cluck');
    assert(!frequencies.slice(beforeTender).includes(987.77), 'tender does not use the coin chime');
    controller.setPlaying(false);
    const paused = starts;
    controller.playBag();
    controller.playTender();
    assert.equal(starts, paused, 'drop effects are silent outside gameplay');
    controller.setPlaying(true);
    for (const id of ['fedoraThrow', 'fedoraFly', 'fedoraHit', 'bag', 'tender'] as const) {
      controller.selectSound(id, 'off');
      const before = starts;
      controller.preview(id);
      assert.equal(starts, before, `${id} respects Off`);
      controller.selectSound(id, 'default');
      controller.preview(id);
      assert(starts > before, `${id} can be previewed independently`);
    }
  } finally {
    controller.setPlaying(false);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});