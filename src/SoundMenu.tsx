// Browser game module for SoundMenu.
import { useEffect, useRef, useState } from 'react';
import { sound } from './audio';
import { SOUND_CATEGORIES, SoundVariant } from './soundSettings';

export function SoundMenu({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(sound.settings);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => { sound.stopPreview(); previous?.focus(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onPointerDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sounds-title" className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--bg)] p-5 outline-none" onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') onClose();
        if (event.key === 'Tab') {
          const elements = panel.current?.querySelectorAll<HTMLElement>('button, select');
          if (!elements?.length) return;
          const first = elements[0], last = elements[elements.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}>
        <div className="flex items-center justify-between mb-3"><h2 id="sounds-title" className="text-lg font-bold">Sound settings</h2><button type="button" onClick={onClose} className="px-3 py-1 border border-[var(--line)] rounded">Close</button></div>
        <p className="text-xs text-[var(--muted)] mb-4">Choose styles for music and game effects. Bull uses Moo and Bear uses Roar. Preview lasts 5 seconds.</p>
        {!sound.enabled && <p className="text-sm text-[var(--red)] mb-3">Sound is muted. Enable the speaker button to preview.</p>}
        {['Player', 'Enemies', 'Pickups', 'Music'].map(group => (
          <section key={group} className="mb-4">
            <h3 className="text-sm font-bold text-[var(--green)] mb-2">{group}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOUND_CATEGORIES.filter(item => item.group === group).map(({ id, label }) => (
                <div key={id} className="p-3 bg-[var(--alt)] rounded border border-[var(--line)]">
                  <label htmlFor={`sound-${id}`} className="block text-xs mb-2">{label}</label>
                  <div className="flex gap-2">
                    <select id={`sound-${id}`} value={settings[id]} onChange={event => { sound.selectSound(id, event.target.value as SoundVariant); setSettings({ ...sound.settings }); }} className="min-w-0 flex-1 rounded bg-[var(--bg)] text-[var(--text)] border border-[var(--line)] p-1 text-sm">
                      <option value="default">{id === 'music' ? 'Trading desk · Funk / Jazz' : 'Signature effect'}</option>
                      <option value="soft">{id === 'music' ? 'Lo-fi · Warm keys' : 'Soft synth'}</option>
                      <option value="arcade">{id === 'music' ? 'Chiptune · Arcade' : 'Arcade synth'}</option>
                      <option value="deep">{id === 'music' ? 'House · Bass groove' : 'Deep / Heavy'}</option>
                      <option value="bright">{id === 'music' ? 'Disco · Bright keys' : 'Crystal / Chime'}</option>
                      <option value="glitch">{id === 'music' ? 'Breakbeat · Glitch' : 'Glitch / Digital'}</option>
                      <option value="organic">{id === 'music' ? 'Swing · Plucked groove' : 'Organic / Textured'}</option>
                      <option value="off">Off</option>
                    </select>
                    <button type="button" disabled={!sound.enabled || settings[id] === 'off'} onClick={() => sound.preview(id)} aria-label={`Preview ${label}`} className="px-2 py-1 text-xs border border-[var(--line)] rounded disabled:opacity-40">▶</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}