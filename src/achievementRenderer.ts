import { drawApeHead, drawBriefcase, drawCharacterHat, drawHumanHead, drawPickupAsset } from './assetRenderer';
import { drawAnimalCharacter, drawAnimalHead } from './animalRenderer';
import { drawDumpster } from './dumpsterRenderer';
import { drawShoePreview } from './cosmeticModels';
import { drawChickenTender } from './tenderRenderer';
import { drawClownMakeup } from './clownRenderer';
import type { Pickup } from './types';
import { drawPet } from './petRenderer';

// Static vignettes share gameplay models/materials, not equipped player state.
// All compositions use a 64px square with a safe transparent inset.
export function drawAchievementArtwork(ctx: CanvasRenderingContext2D, id: string, dark: boolean): void {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const ink = dark ? '#cbd5e1' : '#334155';
  const paper = dark ? '#cbd5e1' : '#fff4d6';
  const at = (x: number, y: number, scale: number, draw: () => void, angle = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale); draw(); ctx.restore();
  };
  const path = (d: string, fill?: string, stroke = ink, width = 1) => {
    const shape = new Path2D(d);
    if (fill) { ctx.fillStyle = fill; ctx.fill(shape); }
    ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(shape);
  };
  const pickup = (type: Pickup['type'], x: number, y: number, scale: number, angle = 0) =>
    at(x, y, scale, () => drawPickupAsset(ctx, { type, x: 0, y: 0, taken: false }, 0, 0, 0, dark, 'M', false), angle);
  const sparkle = (x: number, y: number) => path(`M${x - 3} ${y}h6M${x} ${y - 3}v6`, undefined, '#d5a441');
  const crown = () => {
    path('M20 15 17 6 26 10 32 3 38 10 47 6 44 15Z', '#d5a441', '#896221');
    path('M21 14H43V18H21Z', '#f3ce72', '#896221');
    path('M24 14H40', undefined, '#fff1b8');
  };
  const arrow = (down = false) => {
    const shape = down ? 'M9 39 22 44 31 39 53 54M43 54H53V44' : 'M9 54 22 45 31 49 53 33M43 33H53V43';
    path(shape, undefined, dark ? '#18212f' : '#f8fafc', 5);
    path(shape, undefined, down ? '#cf625b' : '#48a77b', 2.5);
  };
  switch (id) {
    case 'stick-around':
      at(32, 42, 1.4, () => drawPet(ctx, 'pets-stick', dark));
      path('M8 8H24V22H8ZM11 5V11M21 5V11M8 13H24', paper, ink);
      sparkle(49, 18);
      break;
    case 'butterfingers':
      pickup('diamond', 34, 17, .38, -.2);
      path('M12 48 10 39Q10 35 13 37L19 43 17 32Q18 28 21 31L26 41 26 30Q28 27 30 31L33 43 42 36Q47 35 44 40L35 54H20Z', '#e8b78b', '#9d6b4c');
      path('M16 18 12 24M49 23 52 29', undefined, '#7caec2');
      break;
    case 'coin-flipper':
      path('M12 25Q13 9 28 9M12 17V25H20M52 39Q51 55 36 55M44 39H52V47', undefined, ink, 1.5);
      pickup('coin', 32, 32, 1.25, -.25);
      break;
    case 'stomp':
      at(30, 26, .57, () => drawShoePreview(ctx, 'shoes-classic', dark), -.2);
      path('M9 50 18 46 23 52 32 46 40 52 52 47M12 57H18M46 57H52', undefined, '#d5a441', 1.6);
      break;
    case 'printer':
      pickup('banknote', 47, 16, .65, .4);
      pickup('printer', 30, 32, .95);
      sparkle(12, 12);
      break;
    case 'paper-hands':
      for (const x of [12, 34]) {
        path(`M${x} 14l17 -3 3 34 -17 3Z`, paper, '#929a9d');
        path(`M${x + 4} 21l9 -2m-8 7 9 -2m-8 7 7 -2`, undefined, '#8b969c', .7);
      }
      arrow(true);
      break;
    case 'bagholder':
      pickup('bag', 25, 36, 1.25);
      pickup('bag', 42, 29, .85);
      pickup('coin', 47, 49, .65);
      break;
    case 'mage':
      path('M12 43 28 7 39 40 53 47Q30 55 9 48Z', '#36577f', '#20354f');
      path('M28 7 28 40 39 40Z', '#223b5b', '#223b5b');
      path('M16 38Q27 44 39 40L41 45Q28 49 14 43Z', '#d5a441', '#896221');
      pickup('diamond', 46, 20, .26);
      sparkle(12, 18);
      break;
    case 'tender-enjoyer':
      path('M14 27 48 24 44 54 20 56Z', '#a7443e', '#682e2b');
      path('M18 28 24 29 28 55 21 55ZM34 27 40 26 37 55 32 55Z', paper, paper, .5);
      at(24, 23, .73, () => drawChickenTender(ctx), -1.2);
      at(41, 21, .73, () => drawChickenTender(ctx), -1.1);
      break;
    case 'apes':
      at(17, 35, .78, () => drawApeHead(ctx, false));
      at(47, 35, .78, () => drawApeHead(ctx, false));
      at(32, 24, .95, () => drawApeHead(ctx, true));
      pickup('banana', 33, 52, .7);
      break;
    case 'hat-collector':
      at(26, 56, 1, () => drawCharacterHat(ctx, false, false, dark));
      at(39, 38, .85, () => drawCharacterHat(ctx, false, false, dark));
      sparkle(15, 13);
      break;
    case 'dumpster-enjoyer':
      at(33, 57, .8, () => drawDumpster(ctx, 1, .8, 1, dark));
      break;
    case 'bull-market':
    case 'bear-market':
      at(32, 27, 1.25, () => drawAnimalHead(ctx, id === 'bull-market' ? 'bull' : 'bear', false, dark));
      arrow(id === 'bear-market');
      break;
    case 'whale-rider':
      at(27, 54, .43, () => drawAnimalCharacter(ctx, { type: 'whale', x: 0, y: 0, feet: 0, phase: 0, dead: false }, false, false, dark, false, false, true));
      at(32, 23, .65, () => drawHumanHead(ctx, true, dark));
      path('M30 29 26 37 35 40 39 46M34 30 39 36', undefined, '#64748b', 3);
      break;
    case 'emotional-baggage':
      at(24, 37, .5, () => drawBriefcase(ctx, dark), -.2);
      at(41, 42, .48, () => drawBriefcase(ctx, dark), .12);
      path('M36 19Q29 10 35 7Q40 5 43 10Q49 4 53 10Q56 15 43 24Z', '#b65353', '#773d43');
      path('M49 34 56 31M51 42H59', undefined, ink);
      break;
    case 'boss':
      at(31, 35, 1.1, () => drawHumanHead(ctx, false, dark));
      path('M15 56 18 43 27 40 32 46 37 40 46 43 50 56Z', '#334155', '#18212f');
      path('M27 41 32 46 37 41 35 54 29 54Z', paper, paper);
      path('M32 47 34 50 32 56 30 50Z', '#a7443e', '#682e2b');
      crown();
      break;
    case 'all-time-high':
      path('M6 55 23 26 32 40 43 15 58 55Z', '#526b82', '#30465c');
      path('M23 26 28 36 23 33 17 37ZM43 15 49 32 43 28 37 32Z', paper, paper, .5);
      path('M43 15V4L56 7 43 11', '#d5a441', '#896221');
      pickup('coin', 19, 49, .55);
      break;
    case 'clown-bag':
      pickup('bag', 32, 40, 1.25);
      at(32, 24, .9, () => { drawHumanHead(ctx, false, dark); drawClownMakeup(ctx); });
      break;
    case 'tomato':
      pickup('banana', 22, 37, .85);
      path('M30 33Q45 20 54 35Q61 53 42 55Q26 53 30 33Z', '#bf5145', '#87372f');
      path('M43 34 35 29 42 30 45 23 46 30 53 29Z', '#56836b', '#315f4a');
      break;
    case 'vanishing-case':
      at(25, 35, .53, () => drawBriefcase(ctx, dark));
      path('M45 25H53M49 34H58M43 44H51', undefined, ink);
      sparkle(46, 13);
      break;
    default:
      crown();
      pickup('coin', 32, 39, 1.1);
  }
  ctx.restore();
}