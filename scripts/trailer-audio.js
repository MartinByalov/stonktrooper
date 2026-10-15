// Capture-only audio arrangement, using the game's own synth and compositions.
import { sound } from '../src/audio';
import { composeTrack } from '../src/musicBank';

const events = [];
const last = new Map();
let nesting = false;
for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(sound))) {
  if (!name.startsWith('play') || typeof sound[name] !== 'function') continue;
  const original = sound[name].bind(sound);
  sound[name] = (...args) => {
    const t = (window.trailerFrame ?? 0) / 30;
    const key = name + JSON.stringify(args);
    if (!nesting && t - (last.get(key) ?? -100) > (name === 'playEnemy' ? 1 : 0.1)) {
      events.push({ name, args, t }); last.set(key, t);
    }
    nesting = true;
    try { return original(...args); } finally { nesting = false; }
  };
}

window.getTrailerEvents = () => events;
window.renderTrailerAudio = async (seconds, cuts, recordedEvents = events) => {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * 44100), 44100);
  let time = 0;
  const proxy = new Proxy(ctx, { get(target, key) {
    if (key === 'currentTime') return time;
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  sound.stopPreview(); sound.musicEnabled = false; sound.setPlaying(false);
  sound.ctx = proxy; sound.initCtx = () => {}; sound.enabled = true;
  sound.playing = true; sound.enemyCooldown.clear();
  for (const event of [...recordedEvents]) {
    time = event.t;
    if (time < seconds - 0.8) sound[event.name](...event.args);
  }
  const note = (frequency, start, duration, volume, type = 'triangle') => {
    if (!frequency || start >= seconds) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(seconds, start + duration));
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(start); osc.stop(Math.min(seconds, start + duration + 0.02));
  };
  // Three-act score: suspended opening, pulse-driven escalation, percussion finale.
  const tracks = ['normal', 'pigeon', 'hawk', 'kangaroo'].map(mode => composeTrack(mode, 0));
  const climax = cuts.find(c => c.name === 'Kangaroo duel').startFrame / 30;
  const end = cuts.at(-1).startFrame / 30;
  const stepDuration = 0.25;
  const noiseBuffer = ctx.createBuffer(1, 44100 * 3, 44100);
  const samples = noiseBuffer.getChannelData(0);
  let seed = 8271;
  for (let i=0;i<samples.length;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1; }
  const burst = (start, duration, volume, frequency, rising = false) => {
    if(start<0 || start>=seconds)return;
    duration=Math.min(duration,seconds-start);
    const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    source.buffer=noiseBuffer;source.loop=true;filter.type='bandpass';filter.Q.value=0.7;
    filter.frequency.setValueAtTime(rising?200:frequency,start);
    filter.frequency.exponentialRampToValueAtTime(rising?frequency:220,start+duration);
    gain.gain.setValueAtTime(rising?0.0001:volume,start);
    if(rising)gain.gain.exponentialRampToValueAtTime(volume,start+duration);
    else gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.start(start);source.stop(start+duration);
  };
  for (let step = 0; step * stepDuration < seconds; step++) {
    const t = step * stepDuration;
    if(t>=end)continue;
    const track = tracks[t < 8 ? 0 : t < 25 ? 1 : t < climax ? 2 : 3];
    const i = step % 128, fade = Math.min(1,t/1.2);
    const power=t<5?0.3:t<15?0.65:1;
    // Game motifs remain recognisable, with space for action effects.
    note(track.melody[i] * 2, t, 0.23, 0.045 * fade * power);
    note(track.bass[i], t, 0.32, 0.12 * fade * power, 'sine');
    for (const f of track.chords[i]) note(f/2, t, 0.7, 0.022 * fade);
    if(step%8===0)for(const f of [98,146.83,196])note(f,t,1.9,0.015*fade,'sine');
    if(t>5 && step%2===0){time=t;sound.tone(130,42,0.18,0.14*power,'sine');}
    if(t>10 && step%4===2)burst(t,0.18,0.11*power,1800);
    if(t>15)burst(t,0.045,0.023*(step%2?0.6:1),7000);
    if(t>climax && step%8>=6)burst(t,0.12,0.07,2400);
  }
  for (const cut of cuts) {
    time = cut.startFrame / 30;
    if(time===0)continue;
    const hard=cut.transition==='impact';
    burst(time-0.65,0.65,hard?0.13:0.07,6000,true);
    sound.tone(hard?170:90,32,hard?0.65:0.35,hard?0.3:0.13,'sine');
    burst(time,hard?0.7:0.3,hard?0.15:0.055,hard?2800:1500);
  }
  // A resolved final chord, not an abruptly cut loop.
  for(const f of [98,146.83,196,233.08,293.66])note(f,end,2.8,0.04,'triangle');
  const rendered = await ctx.startRendering();
  const data = rendered.getChannelData(0), bytes = new Uint8Array(data.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < data.length; i++) view.setInt16(i * 2, Math.round(Math.tanh(data[i] * 1.5) * 30000), true);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return { pcm: btoa(binary), events: recordedEvents.length, tracks: tracks.map(t => t.id) };
};