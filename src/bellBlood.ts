export type BellBlood = {
  x: number; y: number; vx: number; vy: number;
  radius: number; life: number; maxLife: number; settled: boolean;
};

const MAX_BLOOD = 360;

// Cosmetic randomness is separate from the encounter's gameplay random stream.
export function emitBellBlood(blood: BellBlood[], x: number, y: number, direction: number,
  strength: number, random = Math.random): void {
  const count = Math.round(24 * strength);
  for (let i = 0; i < count; i++) {
    const angle = (random() - 0.5) * Math.PI * 1.4;
    const speed = (1.5 + random() * 5) * Math.sqrt(strength);
    const life = 45 + Math.floor(random() * 35);
    blood.push({ x: x + (random() - 0.5) * 8, y: y + (random() - 0.5) * 10,
      vx: Math.cos(angle) * speed * (direction < 0 ? -1 : 1),
      vy: Math.sin(angle) * speed - 2, radius: 1 + random() * 2.5,
      life, maxLife: life, settled: false });
  }
  if (blood.length > MAX_BLOOD) blood.splice(0, blood.length - MAX_BLOOD);
}

export function stepBellBlood(blood: BellBlood[], heightAt: (x: number) => number): void {
  for (const drop of blood) {
    drop.life--;
    if (drop.settled) continue;
    const previousY = drop.y;
    drop.vy += 0.22; drop.x += drop.vx; drop.y += drop.vy; drop.vx *= 0.97;
    const floor = heightAt(drop.x);
    if (Number.isFinite(floor) && drop.vy > 0 && previousY <= floor && drop.y >= floor) {
      drop.y = floor - 0.5; drop.vx = 0; drop.vy = 0; drop.settled = true;
      drop.life = Math.max(drop.life, 90); drop.maxLife = Math.max(drop.maxLife, drop.life);
    }
  }
  let live = 0;
  for (const drop of blood) if (drop.life > 0) blood[live++] = drop;
  blood.length = live;
}

export function drawBellBlood(ctx: CanvasRenderingContext2D, blood: BellBlood[]): void {
  ctx.save(); ctx.lineCap = 'round';
  for (const drop of blood) {
    ctx.globalAlpha = Math.min(1, drop.life / 22);
    ctx.fillStyle = drop.settled ? '#881337' : '#dc143c';
    ctx.strokeStyle = '#9f1239'; ctx.lineWidth = drop.radius;
    if (!drop.settled) {
      ctx.beginPath(); ctx.moveTo(drop.x - drop.vx * 1.5, drop.y - drop.vy * 1.5);
      ctx.lineTo(drop.x, drop.y); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(drop.x, drop.y, drop.radius * (drop.settled ? 2 : 1),
      drop.radius * (drop.settled ? 0.45 : 1), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}