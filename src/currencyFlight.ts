import { sound } from './audio';

export const CURRENCY_FLIGHT_DURATION = 1200;
export const CURRENCY_FLIGHT_STAGGER = 120;
export const CURRENCY_COLLECTION_HOLD = 300;

export type CurrencyFlightSource = { canvas: HTMLCanvasElement; x: number; y: number; destination: Element; amount: number };

// Presentation only: rewards are credited by progression, never by this animation.
export function animateCurrencyFlights(host: HTMLElement, sources: CurrencyFlightSource[], onCredit: (fraction: number) => void, onFinish: () => void) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const particles: { node: HTMLCanvasElement; animation: Animation }[] = [];
  let frame = 0, finished = false, arrivalCue = -1;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    for (const { node, animation } of particles) { animation.cancel(); node.remove(); }
    onCredit(1);
    onFinish();
  };
  const settle = () => { if (document.hidden || motion.matches) finish(); };
  if (motion.matches || document.hidden || !sources.length) {
    // Reduced motion skips the flight, not the sound: the arrival cues still play.
    const cues = motion.matches && !document.hidden && sources.length ? [0, 1, 2, 3].map(cue => setTimeout(() => sound.playCollectionArrival(cue), cue * 70)) : [];
    finish();
    return () => { cues.forEach(clearTimeout); };
  }
  for (const source of sources) {
    const bounds = source.destination.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2 - source.x;
    const y = bounds.top + bounds.height / 2 - source.y;
    const count = Math.min(7, Math.max(0, Math.floor(source.amount)));
    // Keep batches quick and bounded, even for large rewards.
    for (let index = 0; index < count; index++) {
      const node = document.createElement('canvas');
      node.width = source.canvas.width; node.height = source.canvas.height;
      node.getContext('2d')?.drawImage(source.canvas, 0, 0);
      node.className = 'achievement-currency-flight';
      node.setAttribute('aria-hidden', 'true');
      node.style.left = `${source.x - 9}px`; node.style.top = `${source.y - 9}px`;
      host.append(node);
      // Fullscreen containers can form a fixed containing block; translate viewport origins into it first.
      const startBounds = node.getBoundingClientRect();
      node.style.left = `${source.x - 9 - (startBounds.left - (source.x - 9))}px`;
      node.style.top = `${source.y - 9 - (startBounds.top - (source.y - 9))}px`;
      const animation = node.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${x * .25 + (index - (count - 1) / 2) * 12}px, ${Math.min(-24, y * .1)}px) scale(1.2)`, opacity: 1, offset: .25 },
        { transform: `translate(${x}px, ${y}px) scale(.8)`, opacity: 1, offset: .85 },
        { transform: `translate(${x}px, ${y}px) scale(.5)`, opacity: 0 },
      ], { duration: CURRENCY_FLIGHT_DURATION - CURRENCY_FLIGHT_STAGGER, delay: count > 1 ? index * CURRENCY_FLIGHT_STAGGER / (count - 1) : 0, easing: 'ease-in', fill: 'both' });
      particles.push({ node, animation });
    }
  }
  const started = performance.now();
  const tick = (now: number) => {
    if (finished) return;
    if (document.hidden || motion.matches) { finish(); return; }
    const fraction = Math.min(1, Math.max(0, (now - started - CURRENCY_FLIGHT_DURATION * .765) / (CURRENCY_FLIGHT_DURATION * .235)));
    const cue = Math.min(3, Math.floor(fraction * 4));
    if (fraction > 0 && cue > arrivalCue) {
      arrivalCue = cue;
      sound.playCollectionArrival(cue);
    }
    onCredit(fraction);
    if (fraction < 1) frame = requestAnimationFrame(tick);
    else finish();
  };
  frame = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', settle);
  motion.addEventListener('change', settle);
  return () => {
    finished = true;
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', settle);
    motion.removeEventListener('change', settle);
    for (const { node, animation } of particles) { animation.cancel(); node.remove(); }
  };
}