// Generate arcade effects and music locally through the Web Audio API.

import { loadSoundSettings, SoundCategory, SoundVariant } from './soundSettings';
import { MusicMode, MusicPlaylist } from './musicBank';

// Boost the whole background arrangement without changing sound effects/master volume.
const MUSIC_VOLUME_BOOST = 3;

export class SoundController {
  private masterGain: GainNode | null = null;
  private masterVolume = 1;

  public setVolume(value: number) {
    this.masterVolume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.015);
    }
  }

  private musicPlaylist = new MusicPlaylist();
  private musicMode: MusicMode = 'normal';
  private musicTrack = this.musicPlaylist.next('normal');
  private nextMusicTime = 0;

  public setMusicMode(mode: MusicMode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.musicTrack = this.musicPlaylist.next(mode);
    this.musicStep = 0;
    this.nextMusicTime = 0;
  }
  public settings = loadSoundSettings();
  private previewing = false;
  private musicPreview = false;
  private previewTimeout: ReturnType<typeof setTimeout> | null = null;

  public selectSound(category: SoundCategory, variant: SoundVariant) {
    this.settings = { ...this.settings, [category]: variant };
    try { localStorage.setItem('stonker-sounds', JSON.stringify(this.settings)); } catch {}
    if (category === 'music') { this.musicStep = 0; this.nextMusicTime = 0; this.syncPlayback(); }
  }

  public stopPreview() {
    if (this.previewTimeout !== null) clearTimeout(this.previewTimeout);
    this.previewTimeout = null;
    this.musicPreview = false;
    this.syncPlayback();
  }

  public preview(category: SoundCategory) {
    if (!this.enabled) return;
    this.unlock();
    this.enemyCooldown.clear();
    if (category === 'music') {
      this.musicPreview = true;
      this.syncPlayback();
      if (this.previewTimeout !== null) clearTimeout(this.previewTimeout);
      this.previewTimeout = setTimeout(() => this.stopPreview(), 5000);
      return;
    }
    this.previewing = true;
    try {
      const actions: Partial<Record<SoundCategory, () => void>> = {
        jump: () => this.playJump(), doubleJump: () => this.playDoubleJump(),
        briefcase: () => this.playBriefcaseThrow(), fedoraThrow: () => this.playFedoraThrow(),
        fedoraFly: () => this.playFedoraFly(), fedoraHit: () => this.playFedoraHit(),
        banana: () => this.playBananaThrow(),
        hit: () => this.playHit(), gameOver: () => this.playGameOver(),
        coin: () => this.playCoin(), diamond: () => this.playDiamond(),
        bag: () => this.playBag(), tender: () => this.playTender(),
        rocket: () => this.playRocket(),
      };
      const action = actions[category];
      if (action) action();
      else this.playEnemy(category as 'bull' | 'bear' | 'whale' | 'swan' | 'bat' | 'chainsaw');
    } finally { this.previewing = false; }
  }

  private customEffect(category: SoundCategory, strength = 1): boolean {
    const variant = this.settings[category];
    if (variant === 'off') return true;
    if (variant === 'default') return false;
    this.initCtx();
    // Keep the retired feed cue's slot empty to preserve other effects' pitches.
    const index = ['jump', 'doubleJump', 'briefcase', 'banana', 'hit', 'gameOver', 'bull', 'bat', 'bear', 'chainsaw', 'whale', 'swan', 'coin', 'diamond', 'rocket', '', 'fedoraThrow', 'fedoraFly', 'fedoraHit'].indexOf(category);
    const frequency = category === 'bag' ? 125 : category === 'tender' ? 460 : 110 + index * 35;
    if (variant === 'deep') {
      this.tone(Math.max(55, frequency / 3), 38, 0.42, 0.09 * strength, 'triangle');
      this.noise(0.23, 0.065 * strength, 500, 100);
      return true;
    }
    if (variant === 'bright') {
      for (const ratio of [1, 1.5, 2]) this.tone((frequency + 440) * ratio, (frequency + 440) * ratio, 0.34 / ratio, 0.035 * strength, 'sine');
      return true;
    }
    if (variant === 'glitch') {
      this.tone(frequency * 2.4, frequency / 2, 0.06, 0.035 * strength, 'square');
      this.tone(frequency * 0.7, frequency * 3, 0.13, 0.025 * strength, 'sawtooth');
      this.noise(0.07, 0.05 * strength, 4000, 800);
      return true;
    }
    if (variant === 'organic') {
      const creature = ['bull', 'bear', 'whale', 'swan'].includes(category);
      if (creature) {
        const pitch = category === 'swan' ? 390 : category === 'whale' ? 180 : 95;
        this.tone(pitch, pitch * 0.65, 0.55, 0.07 * strength, 'triangle');
        this.tone(pitch * 2.03, pitch * 1.3, 0.4, 0.025 * strength, 'sine');
        this.noise(0.4, 0.085 * strength, pitch * 7, pitch * 2);
      } else {
        this.noise(0.18, 0.12 * strength, frequency * 4, frequency);
        this.tone(frequency, frequency * 0.85, 0.19, 0.045 * strength, 'triangle');
      }
      return true;
    }
    this.tone(frequency, variant === 'soft' ? frequency * 1.25 : frequency * 0.5, 0.22, 0.07 * strength, variant === 'soft' ? 'sine' : 'square');
    if (variant === 'arcade') this.noise(0.08, 0.05 * strength, 1800, 450);
    return true;
  }
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  public musicEnabled: boolean = true;
  private playing = false;
  private voices = new Set<AudioScheduledSourceNode>();
  private endingVoices = new Set<AudioScheduledSourceNode>();
  private enemyCooldown = new Map<string, number>();
  private nextFedoraFlyTime = 0;
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  public get enabled() { return this.soundEnabled; }
  public set enabled(value: boolean) {
    this.soundEnabled = value;
    this.syncPlayback();
  }

  public setPlaying(value: boolean) {
    this.playing = value;
    this.syncPlayback();
  }

  // Call in a user gesture, before React effects or animation frames.
  public unlock() {
    if (this.enabled) this.initCtx();
  }

  private syncPlayback() {
    if ((this.playing || this.musicPreview) && this.enabled && this.musicEnabled && this.settings.music !== 'off') this.startChiptuneBass();
    else this.stopChiptuneBass();
    if ((!this.playing && !this.musicPreview) || !this.enabled) {
      for (const voice of this.voices) { try { voice.stop(); } catch {} }
      this.voices.clear();
      this.enemyCooldown.clear();
      this.nextFedoraFlyTime = 0;
    }
    if (!this.enabled) {
      for (const voice of this.endingVoices) { try { voice.stop(); } catch {} }
      this.endingVoices.clear();
    }
  }

  private trackVoice(voice: AudioScheduledSourceNode) {
    this.voices.add(voice);
    voice.onended = () => { this.voices.delete(voice); voice.disconnect(); };
  }

  private tone(frequency: number, endFrequency: number, duration: number, volume: number, type: OscillatorType = 'triangle') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(this.masterGain ?? this.ctx.destination);
    this.trackVoice(osc);
    osc.start(now); osc.stop(now + duration + 0.01);
  }

  private noise(duration: number, volume: number, frequency: number, endFrequency: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass'; filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.masterGain ?? this.ctx.destination);
    this.trackVoice(source);
    source.start(now); source.stop(now + duration);
  }

  public playEnemy(type: 'bull' | 'bear' | 'whale' | 'swan' | 'bat' | 'chainsaw', strength = 1) {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now < (this.enemyCooldown.get(type) ?? 0)) return;
    this.enemyCooldown.set(type, now + (type === 'bat' ? 0.25 : type === 'chainsaw' ? 0.32 : type === 'swan' ? 1.1 : (type === 'bull' || type === 'bear') ? 1.6 : 2.4));
    const level = Math.max(0, Math.min(1, strength));
    if (this.settings[type] === 'off') return;
    if (!['bat', 'bull', 'bear'].includes(type) && this.customEffect(type, level)) return;
    if (type === 'bat') {
      this.noise(0.18, 0.15 * level, 2600, 350);
      this.tone(180, 65, 0.16, 0.035 * level);
    } else if (type === 'chainsaw') {
      this.tone(85, 145, 0.38, 0.028 * level, 'sawtooth');
      this.tone(173, 285, 0.36, 0.014 * level, 'sawtooth');
      this.noise(0.36, 0.055 * level, 750, 1500);
    } else if (type === 'bull') {
      // Audible synthesized moo: keep the fundamental above tiny-speaker range.
      this.tone(150, 92, 0.78, 0.17 * level, 'triangle');
      this.tone(300, 184, 0.68, 0.07 * level, 'sine');
      this.noise(0.24, 0.055 * level, 1100, 320);
    } else if (type === 'bear') {
      // Audible synthesized roar with a midrange growl and broadband texture.
      this.tone(130, 58, 0.82, 0.16 * level, 'sawtooth');
      this.tone(220, 88, 0.62, 0.07 * level, 'triangle');
      this.noise(0.55, 0.18 * level, 1400, 250);
    } else if (type === 'swan') {
      this.tone(620, 280, 0.24, 0.055 * level, 'sawtooth');
      this.noise(0.22, 0.09 * level, 2200, 650);
    } else {
      // Hollow underwater sonar rather than the previous descending cry.
      this.tone(380, 240, 0.9, 0.075 * level, 'sine');
      this.tone(191, 120, 1.1, 0.035 * level, 'sine');
      this.noise(0.45, 0.075 * level, 1200, 160);
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playJump() {
    if (!this.enabled) return;
    if (this.customEffect('jump')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.12);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // AudioContext policy
    }
  }

  public playDoubleJump() {
    if (!this.enabled) return;
    if (this.customEffect('doubleJump')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [360, 580].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.05;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, start + 0.08);

        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain ?? this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.09);
      });
    } catch {}
  }

  public playBriefcaseThrow() {
    if (!this.enabled) return;
    if (this.customEffect('briefcase')) return;
    this.initCtx();
    if (!this.ctx) return;

    this.noise(0.22, 0.19, 1800, 260);
    this.tone(160, 65, 0.16, 0.055, 'triangle');
  }

  public playFedoraThrow() {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    if (this.customEffect('fedoraThrow')) return;
    this.initCtx();
    this.tone(350, 820, 0.22, 0.075, 'sine');
    this.noise(0.16, 0.045, 1200, 4200);
  }

  public playFedoraFly() {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (!this.previewing && now < this.nextFedoraFlyTime) return;
    if (!this.previewing) this.nextFedoraFlyTime = now + 0.42;
    if (this.customEffect('fedoraFly')) return;
    this.tone(570, 430, 0.14, 0.022, 'sine');
    this.noise(0.13, 0.019, 2600, 1500);
  }

  public playFedoraHit() {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    if (this.customEffect('fedoraHit')) return;
    this.initCtx();
    this.tone(690, 220, 0.15, 0.085, 'triangle');
    this.noise(0.1, 0.065, 2400, 650);
  }

  public playBananaThrow() {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    if (this.customEffect('banana')) return;
    this.initCtx();
    this.tone(720, 210, 0.17, 0.065, 'sine');
    this.noise(0.12, 0.075, 3200, 900);
  }

  public playHit() {
    if (!this.enabled) return;
    if (this.customEffect('hit')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // White noise explosion burst
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.13);
    } catch {}
  }

  public playCoin() {
    if (!this.enabled) return;
    if (this.customEffect('coin')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  public playDiamond() {
    if (!this.enabled) return;
    if (this.customEffect('diamond')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.04;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain ?? this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch {}
  }

  public playWarning() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.setValueAtTime(420, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch {}
  }

  public playRocket() {
    if (!this.enabled) return;
    if (this.customEffect('rocket')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [392.0, 523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.05;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain ?? this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.32);
      });

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.7);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.76);
    } catch {}
  }

  public playBell() {
    if (!this.enabled) return;
    this.initCtx();
    this.tone(880, 875, 0.9, 0.09, 'sine');
    this.tone(1320, 1305, 0.65, 0.035, 'sine');
  }

  public playFall() {
    if (!this.enabled || !this.playing) return;
    this.initCtx();
    this.tone(520, 55, 1.4, 0.07, 'triangle');
    this.tone(260, 35, 1.1, 0.035, 'sine');
    this.noise(0.9, 0.055, 1800, 220);
  }

  public playPigeonDrop() {
    if (!this.enabled || !this.playing) return;
    this.initCtx();
    this.tone(1900, 850, 0.32, 0.045, 'sine');
    this.tone(2600, 1300, 0.18, 0.018, 'triangle');
  }

  public playPigeonSplat() {
    if (!this.enabled || !this.playing) return;
    this.initCtx();
    this.tone(1250, 650, 0.09, 0.04, 'sine');
    this.noise(0.075, 0.055, 3400, 1800);
  }

  public playBird(kind: 'pigeon' | 'white' | 'hawk' | 'swan', strength = 1) {
    if (kind === 'swan') { this.playEnemy('swan', strength); return; }
    if (!this.enabled || !this.playing) return;
    this.initCtx();
    if (!this.ctx) return;
    const key = `bird-${kind}`;
    if (this.ctx.currentTime < (this.enemyCooldown.get(key) ?? 0)) return;
    this.enemyCooldown.set(key, this.ctx.currentTime + 1.3);
    if (kind === 'pigeon') {
      this.tone(320, 210, 0.35, 0.07 * strength, 'sine');
      this.tone(240, 290, 0.3, 0.04 * strength, 'sine');
    } else if (kind === 'hawk') {
      this.tone(1400, 420, 0.3, 0.07 * strength, 'sawtooth');
      this.noise(0.18, 0.06 * strength, 2400, 600);
    } else {
      this.tone(620, 380, 0.4, 0.06 * strength, 'triangle');
      this.noise(0.22, 0.04 * strength, 1300, 400);
    }
  }

  public playBag() {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    if (this.customEffect('bag')) return;
    this.initCtx();
    this.tone(125, 42, 0.3, 0.14, 'triangle');
    this.noise(0.22, 0.1, 650, 120);
  }

  public playTender() {
    if (!this.enabled || (!this.playing && !this.previewing)) return;
    if (this.customEffect('tender')) return;
    this.initCtx();
    // Short, throaty downward cluck, not a rising reward chime.
    this.tone(460, 180, 0.12, 0.075, 'triangle');
    this.tone(690, 270, 0.09, 0.025, 'sine');
    this.noise(0.085, 0.045, 950, 350);
  }

  public playKangarooPunch() {
    if (!this.enabled || !this.playing) return;
    this.initCtx();
    this.noise(0.16, 0.09, 1600, 450);
    this.tone(150, 65, 0.14, 0.08, 'triangle');
  }

  public playGameOver() {
    if (!this.enabled) return;
    if (this.customEffect('gameOver')) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [261.63, 196, 130.81];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.17;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.72, start + 0.35);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain ?? this.ctx.destination);
        this.endingVoices.add(osc);
        osc.onended = () => { this.endingVoices.delete(osc); osc.disconnect(); };

        osc.start(start);
        osc.stop(start + 0.46);
      });
    } catch {}
  }

  public toggleMusic(enable?: boolean) {
    this.musicEnabled = enable !== undefined ? enable : !this.musicEnabled;
    this.syncPlayback();
    return this.musicEnabled;
  }

  private startChiptuneBass() {
    if (this.musicInterval) return;
    this.initCtx();
    this.musicInterval = window.setInterval(() => {
      if (!this.musicEnabled || !this.enabled || this.settings.music === 'off' || (!this.playing && !this.musicPreview) || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now < this.nextMusicTime) return;
      const step = this.musicStep++ % 128;
      const style = this.settings.music;
      const swing = style === 'organic' ? 0.22 : style === 'default' ? 0.12 : 0;
      const tempo = style === 'soft' ? 0.8 : style === 'glitch' ? 1.18 : style === 'deep' ? 1.08 : 1;
      this.nextMusicTime = now + 30 / (this.musicTrack.bpm * tempo) * (step % 2 === 0 ? 1 + swing : 1 - swing);
      const track = this.musicTrack;
      const wave: OscillatorType = style === 'arcade' ? 'square' : style === 'deep' || style === 'glitch' ? 'sawtooth' : style === 'soft' || style === 'bright' ? 'sine' : 'triangle';
      const phraseStep = style === 'glitch' ? (Math.floor(step / 8) * 8 + [0, 2, 1, 3, 4, 6, 5, 7][step % 8]) : step;
      const lead = track.melody[phraseStep] * (style === 'deep' ? 0.5 : 1);
      if (lead && (style !== 'soft' || step % 2 === 0)) {
        this.musicNote(lead, 0.42, 0.012, wave);
        this.musicNote(lead * 2.003, 0.13, 0.0025, 'sine');
      }
      if (track.bass[step]) this.musicNote(track.bass[step], 0.28, 0.045, 'triangle');
      for (const pitch of track.chords[step]) this.musicNote(pitch, 0.55, 0.009, 'triangle');
      if ((track.rhythm[step] & 1) || (style === 'deep' && step % 2 === 0)) this.tone(100, 35, 0.12, (style === 'soft' ? 0.018 : 0.035) * MUSIC_VOLUME_BOOST, 'sine');
      if (track.rhythm[step] & 2) this.noise(0.09, 0.014 * MUSIC_VOLUME_BOOST, 1100, 450);
      if (track.rhythm[step] & 4) this.noise(0.03, 0.004 * MUSIC_VOLUME_BOOST, 3300, 2200);
      // Two complete sixteen-bar loops before selecting the next composition.
      if (this.musicStep >= 256) {
        this.musicTrack = this.musicPlaylist.next(this.musicMode);
        this.musicStep = 0;
      }
    }, 25);
  }
  private musicNote(frequency: number, duration: number, volume: number, wave: OscillatorType) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.musicMode === 'kangaroo' ? 1800 : 1400, now);
    filter.Q.value = 0.4;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume * MUSIC_VOLUME_BOOST, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain ?? this.ctx.destination);
    this.trackVoice(osc);
    osc.start(now); osc.stop(now + duration);
  }

  private stopChiptuneBass() {
    this.nextMusicTime = 0;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sound = new SoundController();
