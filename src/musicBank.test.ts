// Regression checks for musicBank.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MUSIC_BANK, MusicPlaylist, composeTrack } from './musicBank';

test('music bank has fifty-five distinct deterministic sixteen-bar compositions', () => {
  assert.equal(MUSIC_BANK.normal.length, 25);
  assert.equal(MUSIC_BANK.pigeon.length, 10);
  assert.equal(MUSIC_BANK.kangaroo.length, 10);
  const tracks = Object.values(MUSIC_BANK).flat();
  assert.equal(MUSIC_BANK.hawk.length, 10);
  assert.equal(new Set(tracks.map(t => JSON.stringify(t.melody))).size, 55);
  for (const track of tracks) {
    assert.equal(track.melody.length, 128);
    assert.equal(track.bass.length, 128);
    assert(track.melody.every(n => Number.isFinite(n) && n >= 0));
  }
  assert.deepEqual(composeTrack('normal', 4), MUSIC_BANK.normal[4]);
});

test('normal arrangements vary rhythms, bass phrasing and syncopated chord attacks', () => {
  const signatures = MUSIC_BANK.normal.map(track => JSON.stringify({
    bass: track.bass.map(n => n > 0),
    chords: track.chords.map(notes => notes.length > 0),
    rhythm: track.rhythm,
  }));
  assert.equal(new Set(signatures).size, 25);
  for (const track of MUSIC_BANK.normal) {
    assert(track.chords.some((notes, step) => step % 2 === 1 && notes.length > 0));
    assert.notDeepEqual(track.melody.slice(0, 32), track.melody.slice(32, 64));
  }
});

test('each mode exhausts its shuffled playlist before repeating', () => {
  const playlist = new MusicPlaylist();
  for (const mode of ['normal', 'pigeon', 'kangaroo', 'hawk'] as const) {
    const count = MUSIC_BANK[mode].length;
    const first = Array.from({ length: count }, () => playlist.next(mode).id);
    assert.equal(new Set(first).size, count);
    assert.notEqual(playlist.next(mode).id, first[count - 1]);
  }
});

test('reworked arrangements leave space for the rhythm section instead of constant high leads', () => {
  for (const track of Object.values(MUSIC_BANK).flat()) {
    const notes = track.melody.filter(n => n > 0);
    assert(notes.length > 0 && notes.length < 64);
    assert(Math.max(...notes) < 500);
    assert(track.bass.some(n => n > 0));
    assert(track.chords.some(notes => notes.length >= 3));
  }
});