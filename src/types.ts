// Browser game module for types.
import { MarketNews } from './news';

export type GameState = 'menu' | 'play' | 'paused' | 'over' | 'boxing';

export interface Candle {
  o: number;     // Open price Y
  c: number;     // Close price Y
  h: number;     // High price Y
  l: number;     // Low price Y
  top: number;   // Visual top (min of o, c)
  bot: number;   // Visual bottom (max of o, c)
  sp?: boolean;  // Special yellow zone (charges double jump)
  v: number;     // Volume factor 0..1
  k: string;     // Candlestick pattern name (Doji, Marubozu, Hammer, etc.)
  hole?: boolean;// True if gap / hole in the market
  direction?: 'up' | 'down';
  shock?: boolean;
  doubleJumpBarrier?: boolean;
}

export interface Player {
  x: number;
  y: number;
  vy: number;
  coy: number;
  buf: number;
  ph: number;
  air: boolean;
  doubleReady: boolean;
  jumps: number;
  carry: number;       // Diamond hands duration in frames (holding diamond)
  shieldKind?: 'diamond' | 'bag';
  rocketTimer: number; // Rocket ride duration in frames (seated in rocket, invulnerable, killing beasts)
  previousY: number;
}

export interface Pickup {
  rotation?: number;
  x: number;
  y: number;
  type: 'coin' | 'diamond' | 'banknote' | 'bag' | 'banana' | 'tender' | 'bell' | 'printer' | 'fedora';
  taken: boolean;
  isAir?: boolean;    // True if positioned for single jump trajectory
  vy?: number;
  launchTop?: number;
  upwardFrames?: number;
}

export interface Swan {
  fedoraHats?: number;
  cargoRolled?: boolean;
  cargoFlight?: boolean;
  cargo?: Animal['type'];
  cargoReleaseRatio?: number;
  tenderDropTimer?: number;
  soiledHat?: boolean;
  flightLane?: number;
  kind?: 'swan' | 'pigeon' | 'white' | 'hawk';
  shieldPassed?: boolean;
  lootRolled?: boolean;
  x: number;
  y: number;
  baseY: number;
  targetY?: number;
  locked?: boolean;
  phase: number;
  dead: boolean;
  dying?: boolean;
  dieTimer?: number;
  dieVx?: number;
  dieVy?: number;
  dieAngle?: number;
  isCharging?: boolean;
}

export interface Animal {
  trackRotation?: number;
  fedoraHats?: number;
  mountFedoraHats?: number;
  aimedHits?: number;
  mount?: 'bear' | 'bull' | 'whale';
  dropVelocity?: number;
  jumpAmount?: number;
  lootRolled?: boolean;
  shieldPassed?: boolean;
  attackTimer?: number;
  attackHit?: boolean;
  x: number;
  y: number;
  feet: number;
  phase: number;
  type: 'bear' | 'bull' | 'whale';
  dead: boolean;
  dying?: boolean;
  dieTimer?: number;
  dieVx?: number;
  dieVy?: number;
  dieAngle?: number;
  isCharging?: boolean;
}

export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface Briefcase {
  kind?: 'banana';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  angle: number;
}

export interface MarketEvent {
  index: number;
  spawned: boolean;
}

export interface MarketLevel {
  n: string;       // Name
  t: string;       // Regime ticker (NORMAL, CRASH, SQUEEZE, RECOVERY)
  tint: string;    // Canvas background tint
  bull: number;    // Bullish probability
  vol: number;     // Volatility magnitude
  description: string;
}

export interface ActiveNews {
  news: MarketNews;
  remainingFrames: number;
  totalFrames: number;
}
