// Browser game module for musicBank.
export type MusicMode = 'normal' | 'pigeon' | 'kangaroo' | 'hawk';
export interface MusicTrack {
  id: string;
  bpm: number;
  melody: number[];
  bass: number[];
  chords: number[][];
  rhythm: number[];
}
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function composeTrack(mode: MusicMode, index: number): MusicTrack {
  let seed = 91873 + index * 104729 + ['normal', 'pigeon', 'kangaroo', 'hawk'].indexOf(mode) * 65537;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const scale = index % 3 === 0 ? [0, 2, 3, 5, 7, 9, 10] : [0, 2, 3, 5, 7, 8, 10];
  const root = 43 + index % 7;
  const progressions = [[0, 3, 1, 4], [1, 4, 0, 5], [0, 5, 3, 1], [0, 3, 5, 4], [0, 2, 5, 4], [3, 4, 2, 5], [0, 1, 3, 4], [5, 1, 4, 0]];
  const progression = mode === 'kangaroo' ? [0, 3, 0, 4] : mode === 'hawk' ? [0, 5, 3, 4] : mode === 'pigeon' ? [0, 3, 4, 0] : progressions[index % progressions.length];
  const note = (degree: number, octave = 0) => root + scale[((degree % 7) + 7) % 7] + Math.floor(degree / 7) * 12 + octave;
  // Sparse chord-tone phrases; the bass and drums carry the groove.
  let cursor = 2;
  const motif = Array.from({ length: 8 }, () => {
    cursor = Math.max(0, Math.min(4, cursor + Math.floor(random() * 3) - 1));
    return cursor;
  });
  const response = motif.map((value, i) => (i % 3 === 0 ? 6 - value : value + 1));
  const bassPatterns = [[0, 3, 4, 7], [0, 2, 5, 7], [0, 1, 4, 6], [0, 3, 5, 6]];
  const chordPatterns = [[0, 3, 6], [1, 4, 7], [0, 5], [2, 5, 7]];
  // Composed two-bar hooks. null is a rest, not a randomly selected scale note.
  const hooks: (number | null)[][] = [
    [null, 4, null, 3, 2, null, null, 0, null, null, 2, null, 5, 4, null, 2],
    [0, null, null, 4, null, 2, null, null, 3, null, 2, null, null, 1, 0, null],
    [null, null, 2, 4, null, null, 3, null, 2, null, null, 0, null, 2, null, 1],
    [4, null, 2, null, null, 3, null, 4, null, 5, null, null, 3, null, 2, null],
    [null, 0, null, null, 3, 2, null, null, 4, null, null, 2, null, 1, null, 0],
    [2, null, null, 1, null, 0, null, 4, null, null, 3, 2, null, null, 1, null],
    [null, 3, null, 2, null, 4, null, null, 5, null, 4, null, 2, null, null, 0],
    [0, null, 2, null, 4, null, null, 3, null, 2, null, null, 1, null, 0, null],
    [null, 2, null, 5, null, 4, 2, null, null, 0, null, 3, null, null, 1, null],
    [3, null, null, 1, 0, null, null, 2, null, 4, null, null, 2, null, 0, null],
    [null, 5, 4, null, null, 2, null, 3, null, null, 1, null, 0, null, 2, null],
    [1, null, 3, null, null, 5, null, null, 4, null, 2, null, null, 0, null, 1],
    [null, 4, null, null, 1, null, 2, null, 5, null, null, 3, null, 2, 0, null],
    [2, null, 0, null, 3, null, null, 5, null, 4, null, 1, null, null, 2, null],
    [null, 1, null, 4, 3, null, null, 2, null, 5, null, null, 0, null, 1, null],
    [5, null, null, 2, null, 3, null, 0, null, null, 4, null, 1, null, 2, null],
  ];
  const modeOffset = ['normal', 'pigeon', 'kangaroo', 'hawk'].indexOf(mode);
  const melody: number[] = [], bass: number[] = [], chords: number[][] = [], rhythm: number[] = [];
  for (let step = 0; step < 128; step++) {
    const bar = Math.floor(step / 8), beat = step % 8;
    const degree = progression[Math.floor(bar / (index % 3 === 0 ? 1 : 2)) % 4];
    const phrase = Math.floor(bar / 4);
    const hook = hooks[(index + modeOffset * 2 + (phrase % 2 ? 3 : 0)) % hooks.length];
    const hookNote = hook[step % 16];
    let melodicDegree = hookNote ?? 0;
    if (phrase === 2) melodicDegree = 4 - melodicDegree;
    if (mode === 'hawk') melodicDegree = 4 - melodicDegree;
    if (mode === 'kangaroo') melodicDegree = Math.max(0, melodicDegree - 1);
    // Hold a tonal centre across the chord changes rather than transposing every note.
    melody.push(hookNote === null ? 0 : frequency(note(melodicDegree + (phrase === 3 ? 1 : 0))));
    const bassDegree = beat === 7 ? progression[(Math.floor(bar / 2) + 1) % 4] - 1 : degree + (beat >= 4 ? 4 : 0);
    bass.push(bassPatterns[index % 4].includes(beat) ? frequency(note(bassDegree, -12)) : 0);
    const voicing = mode === 'kangaroo' ? [0, 4, 6] : index % 2 ? [2, 6, 8] : [2, 4, 6, 8];
    chords.push(chordPatterns[(index + phrase) % 4].includes(beat) ? voicing.map(interval => frequency(note(degree + interval) - (interval >= 8 ? 12 : 0))) : []);
    rhythm.push(((mode === 'pigeon' ? beat % 2 === 0 : beat === 0 || beat === 4 || beat === (index % 2 ? 7 : 3)) ? 1 : 0) | (beat === 2 || beat === 6 || (bar % 4 === 3 && beat === 7) ? 2 : 0) | (random() > 0.12 ? 4 : 0));
  }
  return { id: `${mode}-${index + 1}`, bpm: (mode === 'normal' ? 112 : mode === 'pigeon' ? 124 : mode === 'hawk' ? 118 : 132) + index % 5 * 2, melody, bass, chords, rhythm };
}
export const MUSIC_BANK: Record<MusicMode, MusicTrack[]> = {
  normal: Array.from({ length: 25 }, (_, i) => composeTrack('normal', i)),
  pigeon: Array.from({ length: 10 }, (_, i) => composeTrack('pigeon', i)),
  hawk: Array.from({ length: 10 }, (_, i) => composeTrack('hawk', i)),
  kangaroo: Array.from({ length: 10 }, (_, i) => composeTrack('kangaroo', i)),
};

export class MusicPlaylist {
  private queues: Partial<Record<MusicMode, MusicTrack[]>> = {};
  private last: Partial<Record<MusicMode, string>> = {};
  next(mode: MusicMode): MusicTrack {
    if (!this.queues[mode]?.length) {
      const queue = [...MUSIC_BANK[mode]];
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      if (queue[0].id === this.last[mode]) [queue[0], queue[1]] = [queue[1], queue[0]];
      this.queues[mode] = queue;
    }
    const track = this.queues[mode]!.shift()!;
    this.last[mode] = track.id;
    return track;
  }
}