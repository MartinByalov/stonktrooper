import { CloseButton } from './CloseButton';
import { useEffect, useRef, useState } from 'react';
import {} from 'lucide-react';
import { drawApeAsset, drawApeHead, drawApeHat, drawCharacterHat, drawHeadHat, drawHumanHead, drawSwanAsset } from './assetRenderer';
import { HEAD_HAT_CONTACTS, type HatHead } from './hatContact';
import { drawAnimalCharacter, drawAnimalHead } from './animalRenderer';
import { drawControlGameplay } from './TouchControlPreview';
import { hatMetrics } from './hatPose';
import { SKINS } from './progression';
import type { Animal, Swan } from './types';
import { drawMountedPreview } from './mountRiderRenderer';
import { drawMount } from './mountRenderer';
import { drawRidingSuit } from './cosmeticModels';

export const CAPTAIN_FIT_SCENES = Object.keys(HEAD_HAT_CONTACTS).map(head => `Captain — ${head}` as const);
export const HAT_FIT_SCENES = [
  ...CAPTAIN_FIT_SCENES,
  'Hero — equipped hat', 'Hero — nested stack', 'Ape hero — captain', 'Ape hero — weapon stack',
  'Ape companion — walking', 'Ape companion — seated', 'Ape companion — throwing',
  'Hero — rocket head / stack', 'Ape hero — rocket head / stack',
  'Hero — whale ride', 'Hero — bull ride', 'Hero — bear ride', 'Hero — frog ride',
  'Bear enemy', 'Bull enemy', 'Bear charging', 'Bull charging',
  'Bear rider / bull mount', 'Bull rider / bear mount', 'Bear rider / whale mount', 'Whale',
  'Swan', 'Swan charging', 'Pigeon', 'White swan', 'Hawk',
  'Swan — stolen hat', 'Swan charging — stolen hat', 'Pigeon — stolen hat', 'White swan — stolen hat', 'Hawk — stolen hat',
  'Swan — stolen captain', 'Swan charging — stolen captain', 'Pigeon — stolen captain', 'White swan — stolen captain', 'Hawk — stolen captain',
  'Throw — on head', 'Throw — reaching', 'Throw — grabbing', 'Throw — windup', 'Throw — release', 'Throw — enemy wearing hat',
] as const;
export type HatFitScene = typeof HAT_FIT_SCENES[number];

export const STACK_HAT_MODELS = SKINS.filter(item => item.category === 'hats');

// Two identical-size anatomy views, using the gameplay adapter and stack lift.
export function drawHatStackComparison(ctx: CanvasRenderingContext2D, skin: string, count: number, dark: boolean): void {
  ctx.clearRect(0, 0, 480, 320);
  ctx.fillStyle = dark ? '#182233' : '#edf3f8'; ctx.fillRect(0, 0, 480, 320);
  for (const [index, head] of (['human', 'ape'] as const).entries()) {
    ctx.save();
    ctx.translate(120 + index*240, 256); ctx.scale(2.7, 2.7);
    if (head === 'human') drawHumanHead(ctx, false, dark); else drawApeHead(ctx, false);
    for (let stack = 0; stack < count; stack++) {
      drawHeadHat(ctx, head, false, dark, skin, 0, stack, false, stack === count-1);
    }
    ctx.restore();
  }
  ctx.fillStyle = dark ? '#e2e8f0' : '#172b48'; ctx.font = '14px monospace';
  ctx.fillText('Human', 94, 310); ctx.fillText('Monkey', 330, 310);
}

function HatStackImage({ skin, count, dark }: { skin: typeof STACK_HAT_MODELS[number]; count: number; dark: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    drawHatStackComparison(ctx, skin.id, count, dark);
  }, [skin.id, count, dark]);
  return <figure data-stack-hat={skin.id}><figcaption>{skin.name} — {count} hats</figcaption><canvas ref={canvas} width={960} height={640} role="img" aria-label={`${skin.name}: ${count} stacked hats on human and monkey`} /></figure>;
}

// Static, deterministic frames from the gameplay renderers; no animation clock while open.
export function drawHatFitScene(ctx: CanvasRenderingContext2D, scene: HatFitScene, skin: string, count: number, dark: boolean): void {
  ctx.clearRect(0, 0, 480, 320);
  ctx.fillStyle = dark ? '#182233' : '#edf3f8'; ctx.fillRect(0, 0, 480, 320);
  const throwFrames: Record<string, number> = {
    'Throw — on head': 0, 'Throw — reaching': 42, 'Throw — grabbing': 44,
    'Throw — windup': 48, 'Throw — release': 51, 'Throw — enemy wearing hat': 128,
  };
  ctx.save();
  if (scene.startsWith('Captain — ')) {
    const head = scene.slice('Captain — '.length) as HatHead;
    const contact = HEAD_HAT_CONTACTS[head];
    const zoom = 110 / (contact.front.x - contact.rear.x);
    ctx.translate(220, 210); ctx.scale(zoom, zoom);
    ctx.translate(-contact.middle.x, -contact.middle.y);
    if (head === 'human') drawHumanHead(ctx, false, dark);
    else if (head === 'ape') drawApeHead(ctx, false);
    else if (head === 'bear' || head === 'bull') {
      drawAnimalHead(ctx, head, false, dark, () => drawHeadHat(ctx, head, true, dark));
    }
    else if (head === 'whale' || head === 'frog') drawMount(ctx, head === 'frog' ? 'mounts-wednesday' : 'mounts-classic', 'whale', dark, .8, false, 0, true);
    else {
      // The anatomy contact silhouette keeps every head surface inspectable without preview-only fitting.
      ctx.fillStyle = dark ? '#64748b' : '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(contact.rear.x, contact.rear.y);
      ctx.quadraticCurveTo(contact.middle.x, 2*contact.middle.y-(contact.rear.y+contact.front.y)/2, contact.front.x, contact.front.y);
      ctx.lineTo(contact.front.x, contact.middle.y+14*contact.height);
      ctx.lineTo(contact.rear.x, contact.middle.y+14*contact.height);
      ctx.closePath(); ctx.fill();
    }
    if (head !== 'bear' && head !== 'bull' && head !== 'whale' && head !== 'frog') drawHeadHat(ctx, head, true, dark);
  } else if (scene in throwFrames) {
    ctx.translate(0, 12); ctx.scale(480 / 360, 480 / 360);
    drawControlGameplay(ctx, 'hat-weapon', throwFrames[scene], dark);
  } else if (scene.endsWith('ride')) {
    const kind = scene.includes('bull') ? 'bull' : scene.includes('bear') ? 'bear' : 'whale';
    const mount = scene.includes('frog') ? 'mounts-wednesday' : 'mounts-classic';
    ctx.translate(240, 270); ctx.scale(3, 3);
    drawMountedPreview(ctx, { suit: 'suits-classic', shoes: 'shoes-classic', bag: 'suitcase-classic', hat: skin,
      dark, phase: .8, seconds: 0, airborne: false, velocity: 0, animate: false, mount }, () => {
      ctx.save(); ctx.scale(-.65, .65); drawMount(ctx, mount, kind, dark, .8, false, 0, true); ctx.restore();
    });
  } else if (scene.startsWith('Hero') || scene.startsWith('Ape hero')) {
    ctx.translate(240, scene.includes('rocket') ? 270 : 220); ctx.scale(scene.includes('rocket') ? 4 : 3.2, scene.includes('rocket') ? 4 : 3.2);
    const ape = scene.startsWith('Ape');
    if (scene.includes('rocket')) {
      drawRidingSuit(ctx, 'suits-classic', dark, .8, 'rocket');
      ctx.translate(2, -22); ctx.scale(.65, .65);
    }
    if (ape) drawApeHead(ctx, false); else drawHumanHead(ctx, false, dark);
    if (scene === 'Ape hero — captain') drawApeHat(ctx, true, dark);
    else for (let i = 0; i < (scene === 'Hero — equipped hat' ? 1 : count); i++) {
      ctx.save(); ctx.translate(0, -i * hatMetrics(skin).stackHeight);
      const top = i === (scene === 'Hero — equipped hat' ? 1 : count)-1;
      if (ape) drawApeHat(ctx, false, dark, skin, 0, top); else drawCharacterHat(ctx, false, false, dark, skin, 0, top);
      ctx.restore();
    }
  } else if (scene.startsWith('Ape companion')) {
    ctx.translate(230, 245); ctx.scale(3, 3);
    drawApeAsset(ctx, .8, scene.includes('seated'), scene.includes('throwing') ? 10 : 0);
  } else if (/^(Swan|Pigeon|White swan|Hawk)/.test(scene)) {
    const kind = scene.startsWith('Pigeon') ? 'pigeon' : scene.startsWith('White swan') ? 'white' : scene.startsWith('Hawk') ? 'hawk' : 'swan';
    ctx.translate(260, kind === 'white' ? 150 : 230); ctx.scale(kind === 'swan' || kind === 'white' ? 5 : 3, kind === 'swan' || kind === 'white' ? 5 : 3);
    drawSwanAsset(ctx, { kind, phase: .8, isCharging: scene.includes('charging'), lootRolled: true,
      fedoraHats: scene.includes('stolen') ? 0 : count,
      stolenHat: scene.includes('stolen') ? scene.includes('captain') ? 'captain' : 'default' : undefined } as Swan, false, dark, skin);
  } else {
    const mount = scene.includes(' / bull') ? 'bull' : scene.includes(' / bear') ? 'bear' : scene.includes(' / whale') ? 'whale' : undefined;
    const type = scene === 'Whale' ? 'whale' : scene.startsWith('Bear') ? 'bear' : 'bull';
    ctx.translate(240, 290); ctx.scale(mount ? 1.65 : type === 'whale' ? 2.5 : 2.7, mount ? 1.65 : type === 'whale' ? 2.5 : 2.7);
    drawAnimalCharacter(ctx, { type, mount, phase: .8, x: 0, y: 0, feet: 0, dead: false,
      isCharging: scene.includes('charging'), fedoraHats: count, mountFedoraHats: count } as Animal,
    true, false, dark, false, false, false, false, skin);
  }
  ctx.restore();
}

function HatFitImage({ scene, skin, count, dark }: { scene: HatFitScene; skin: string; count: number; dark: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) drawHatFitScene(ctx, scene, skin, count, dark);
  }, [scene, skin, count, dark]);
  return <figure><figcaption>{scene}</figcaption><canvas ref={canvas} width={480} height={320} role="img" aria-label={scene} /></figure>;
}

export function HatFitGallery({ theme, hatSkin, onClose }: { theme: 'light' | 'dark'; hatSkin: string; onClose: () => void }) {
  const [skin, setSkin] = useState(hatSkin);
  const [dark, setDark] = useState(theme === 'dark');
  const [count, setCount] = useState(5);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="hat-fit-overlay" onPointerDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="hat-fit-dialog" role="dialog" aria-modal="true" aria-labelledby="hat-fit-title" onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button, select') ?? [])];
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
      }
    }}>
      <div className="hat-fit-heading"><h2 id="hat-fit-title">Hat fit — character gallery</h2><CloseButton type="button" aria-label="Close hat fit gallery" onClick={onClose} /></div>
      <div className="hat-fit-controls">
        <label>Hat <select value={skin} onChange={event => setSkin(event.target.value)}>{SKINS.filter(item => item.category === 'hats').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Stack <select value={count} onChange={event => setCount(Number(event.target.value))}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Theme <select value={dark ? 'dark' : 'light'} onChange={event => setDark(event.target.value === 'dark')}><option value="light">Day</option><option value="dark">Night</option></select></label>
      </div>
      <div className="hat-fit-content"><h3>All hat models — stack comparison</h3><p>Every equipped hat on Human and Monkey using gameplay stack spacing. Stack and Theme update all images; only the top Smooth Brain hat has a propeller. Captain caps are worn singly and shown separately below.</p>
        <div className="hat-fit-grid">{STACK_HAT_MODELS.map(item => <HatStackImage key={item.id} skin={item} count={count} dark={dark} />)}</div>
        <h3>Captain — original desktop cap</h3><p>Current gameplay fitting, one rigid cap per head. Human, Ape, bear, bull and mounts show character artwork; bird and boss close-ups show anatomy contact surfaces. Theme applies to all previews.</p>
        <div className="hat-fit-grid">{CAPTAIN_FIT_SCENES.map(scene => <HatFitImage key={scene} scene={scene} skin={skin} count={1} dark={dark} />)}</div>
        <h3>Gameplay characters and stacks</h3><p>Hat and Stack apply to equipped hats below. Companion, mount and stolen captain caps keep their original design.</p>
        <div className="hat-fit-grid">{HAT_FIT_SCENES.filter(scene => !scene.startsWith('Captain — ')).map(scene => <HatFitImage key={scene} scene={scene} skin={skin} count={count} dark={dark} />)}</div>
      </div>
    </div>
  </div>;
}