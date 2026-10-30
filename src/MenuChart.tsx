import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AssetPreview, type PreviewAsset } from './AssetPreview';

// Two small scenes frame the controls. Coordinates are local to each side,
// keeping the complete cast away from the menu, Donate and chart axes.
const scenery: { asset: PreviewAsset; side: 'left' | 'right'; x: number; y: number; size: number }[] = [
  { asset: 'pigeon', side: 'left', x: 0.10, y: 0.10, size: 0.21 },
  { asset: 'printer', side: 'left', x: 0.88, y: 0.55, size: 0.15 },
  { asset: 'hawk', side: 'left', x: 0.72, y: 0.13, size: 0.23 },
  { asset: 'tender', side: 'left', x: 0.69, y: 0.75, size: 0.13 },
  { asset: 'coin', side: 'left', x: 0.29, y: 0.65, size: 0.12 },
  { asset: 'coin', side: 'left', x: 0.41, y: 0.85, size: 0.12 },
  { asset: 'bull', side: 'left', x: 0.18, y: 0.64, size: 0.29 },
  { asset: 'ape', side: 'left', x: 0.58, y: 0.69, size: 0.23 },
  { asset: 'banana', side: 'left', x: 0.52, y: 0.95, size: 0.13 },
  { asset: 'swan', side: 'right', x: 0.14, y: 0.12, size: 0.23 },
  { asset: 'white', side: 'right', x: 0.49, y: 0.10, size: 0.22 },
  { asset: 'banknote', side: 'right', x: 0.61, y: 0.85, size: 0.14 },
  { asset: 'whale', side: 'right', x: 0.72, y: 0.40, size: 0.33 },
  { asset: 'diamond', side: 'right', x: 0.40, y: 0.38, size: 0.12 },
  { asset: 'bag', side: 'right', x: 0.55, y: 0.65, size: 0.13 },
  { asset: 'bear', side: 'right', x: 0.81, y: 0.74, size: 0.27 },
  { asset: 'jerome', side: 'right', x: 0.13, y: 0.70, size: 0.25 },
  { asset: 'bell', side: 'right', x: 0.96, y: 0.85, size: 0.13 },
];
// Home characters move like their in-game counterparts: game speed (world px
// per 60fps frame, scaled to the sprite) and walk/wing phase per second.
// They travel right to left and re-enter from the right edge.
const characterMotion: Partial<Record<PreviewAsset, { speed: number; phaseRate: number }>> = {
  pigeon: { speed: 2, phaseRate: 5.4 }, hawk: { speed: 2, phaseRate: 5.4 }, swan: { speed: 2, phaseRate: 5.4 }, white: { speed: 2, phaseRate: 5.4 },
  bull: { speed: 1.5, phaseRate: 9.6 }, bear: { speed: .9, phaseRate: 9.6 }, whale: { speed: .9, phaseRate: 9.6 },
  ape: { speed: 1.2, phaseRate: 9 }, jerome: { speed: .9, phaseRate: 9.6 },
};
// In-game height that a Home sprite's extent stands for.
const GAME_SPRITE_SIZE = 64;
// Home is a calm backdrop: characters keep their game gait at a slower pace.
const HOME_PACE = .4;
type Mover = {
  node: SVGForeignObjectElement; startX: number; startY: number; extent: number; lift: number;
  bird: boolean; speed: number; phaseRate: number; y?: number; x?: number;
};

export function MenuChart({ theme }: { theme: 'light' | 'dark' }) {
  const root = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 1040, height: 480, portrait: false, mobile: false });
  const movers = useRef(new Map<number, Mover>());
  const geometry = useRef<{ groundAt: (x: number) => number; plotWidth: number; plotHeight: number; volumeHeight: number }>({ groundAt: () => 0, plotWidth: 1, plotHeight: 1, volumeHeight: 0 });
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = performance.now();
    const started = last;
    const place = (mover: Mover, x: number, now: number, dt: number) => {
      let y: number;
      if (mover.bird) {
        // Birds hold their altitude with the game's gentle wing-synced bob,
        // instead of tracing the chart.
        y = mover.startY + Math.sin(now / 1000 * mover.phaseRate) * 5 * mover.extent / GAME_SPRITE_SIZE;
      } else {
        const target = Math.max(4, geometry.current.groundAt(x + mover.extent / 2) - mover.extent - mover.lift);
        // Ease between candle tops; snap after wrapping or on the first frame.
        const wrapped = mover.x !== undefined && x > mover.x;
        y = mover.y === undefined || wrapped || !dt ? target : mover.y + (target - mover.y) * (1 - Math.exp(-dt / 160));
      }
      mover.x = x; mover.y = y;
      mover.node.setAttribute('x', x.toFixed(2));
      mover.node.setAttribute('y', y.toFixed(2));
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      const still = motion.matches || !!root.current?.closest('[data-animations="false"]');
      const { plotWidth } = geometry.current;
      for (const mover of movers.current.values()) {
        if (still) { place(mover, mover.startX, 0, 0); continue; }
        // Wrap over the plot plus the sprite width, so it fully leaves before re-entering.
        const span = plotWidth + mover.extent;
        const travelled = mover.speed * (now - started) / 1000;
        place(mover, ((mover.startX + mover.extent - travelled) % span + span) % span - mover.extent, now, dt);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      if (width > 0 && height > 0) {
        setSize(previous => previous.width === width && previous.height === height
          && previous.portrait === portrait && previous.mobile === mobile
          ? previous : { width, height, portrait, mobile });
      }
    };
    // Resolve the real Home geometry before paint, not one frame after mount.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.parentElement?.querySelectorAll('.landing-menu-actions, .home-coffee-link') ?? []) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, []);

  // Render in CSS pixels: candles, volume and labels never stretch with the panel.
  const { width, height, portrait, mobile } = size;
  const candleWidth = portrait ? 3.6 : 2.6;
  const priceColumnWidth = portrait ? 0 : mobile ? 28 : 54;
  const plotWidth = Math.max(1, width - priceColumnWidth);
  // Put portrait's outer candle centres on the screen edges. The plot clips
  // their bodies and volume bars, so neither side ends in an empty gutter.
  const portraitIntervals = Math.max(1, Math.ceil(plotWidth / 6));
  const candleSpacing = portrait ? plotWidth / portraitIntervals : 4;
  const plotHeight = Math.max(1, height - (portrait ? 24 : 18));
  const volumeHeight = Math.min(28, plotHeight * 0.08);
  const menuWidth = Math.min(width * 0.34, 320);
  const sideWidth = Math.max(1, (width - menuWidth) / 2 - 24);
  const sceneUnit = Math.min(sideWidth, plotHeight * 0.46, 220);
  const priceHeight = Math.max(1, plotHeight - volumeHeight - 10);
  const count = portrait ? portraitIntervals + 1 : Math.max(2, Math.floor(plotWidth / candleSpacing));
  // A seeded market walk keeps its shape on rerenders, without periodic candles.
  let seed = 73129;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const trendY = (progress: number) => progress < 0.38
    ? 0.28 + progress / 0.38 * 0.47
    : progress < 0.64
      ? 0.75 + (progress - 0.38) / 0.26 * 0.05
      : 0.80 - (progress - 0.64) / 0.36 * 0.63;
  let previousClose = priceHeight * trendY(0);
  let swing = 0;
  let swingRemaining = 0;
  const candles = Array.from({ length: count }, (_, index) => {
    if (swingRemaining-- <= 0) {
      swing = (random() - 0.5) * 0.018;
      swingRemaining = 3 + Math.floor(random() * 10);
    }
    const open = previousClose;
    const target = priceHeight * trendY((index + 1) / count);
    const volatility = priceHeight * (0.004 + random() * 0.012);
    const move = (target - open) * 0.18 + swing * priceHeight
      + (random() - 0.5) * volatility * 2;
    const close = Math.max(priceHeight * 0.08, Math.min(priceHeight * 0.91, open + move));
    previousClose = close;
    const upperWick = 0.5 + random() ** 2 * volatility;
    const lowerWick = 0.5 + random() ** 2 * volatility;
    const activity = Math.min(1, Math.abs(close - open) / Math.max(1, volatility));
    const volume = Math.min(volumeHeight, 3 + (0.15 + activity * 0.5 + random() * 0.35) * Math.max(0, volumeHeight - 3));
    return { x: (portrait ? 0 : 2) + index * candleSpacing, open, close, volume, upperWick, lowerWick };
  });
  geometry.current = {
    groundAt: x => { const candle = candles[Math.max(0, Math.min(count - 1, Math.round((x - 2) / candleSpacing)))]; return Math.min(candle.open, candle.close); },
    plotWidth, plotHeight, volumeHeight,
  };
  const priceTickSpacing = portrait ? 64 : 48;
  const priceTicks = Array.from({ length: Math.max(1, Math.floor(priceHeight / priceTickSpacing)) }, (_, index) => 24 + index * priceTickSpacing);
  const timeStep = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / 70)) / 10)) * 10;
  // The menu is centred in the full panel, not the plot minus its price axis.
  const timeSpacing = timeStep * candleSpacing;
  const centerX = width / 2;
  const firstTick = Math.ceil(-centerX / timeSpacing);
  const lastTick = Math.floor((plotWidth - centerX) / timeSpacing);
  const centerMinute = portrait ? 4 * 60 + 20 : Math.round(count / 2 / timeStep) * timeStep;
  const timeTicks = Array.from({ length: Math.max(0, lastTick - firstTick + 1) }, (_, index) => {
    const offset = firstTick + index;
    return { x: centerX + offset * timeSpacing, minute: centerMinute + offset * timeStep };
  });
  const timeLabel = (index: number) => {
    const minutes = (((portrait ? 0 : 9 * 60) + index) % 1440 + 1440) % 1440;
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  };

  return <svg ref={root} className="landing-menu-chart" data-layout={portrait ? 'portrait' : 'landscape'} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="landing-chart-plot"><rect width={plotWidth} height={plotHeight} /></clipPath>
    </defs>
    <rect width={width} height={height} fill="var(--menu-chart-bg, #ffffff)" />
    <g stroke="var(--menu-chart-grid, #d3dde780)" strokeWidth="1">
      {priceTicks.map(y => <path key={y} d={`M0 ${y}H${plotWidth}`} />)}
      {timeTicks.map(tick => <path key={tick.minute} d={`M${tick.x} 0V${plotHeight}`} />)}
      {!portrait && <path d={`M${plotWidth} 0V${height}`} />}
      <path d={`M0 ${plotHeight}H${width}`} />
    </g>
    <g clipPath="url(#landing-chart-plot)">
    {candles.map((candle, index) => {
      const top = Math.min(candle.open, candle.close);
      const bottom = Math.max(candle.open, candle.close);
      const color = candle.close < candle.open ? '#08795c' : '#ef5350';
      return <g key={index} fill={color} stroke={color}>
        <rect x={candle.x - candleWidth / 2} y={plotHeight - candle.volume} width={candleWidth} height={candle.volume} opacity="0.27" stroke="none" />
        <path d={`M${candle.x} ${top - candle.upperWick}V${bottom + candle.lowerWick}`} strokeWidth="0.65" />
        <rect x={candle.x - candleWidth / 2} y={top} width={candleWidth} height={Math.max(1, bottom - top)} stroke="none" />
      </g>;
    })}
    {!portrait && scenery.map(({ asset, side, x, y, size: factor }, index) => {
      const extent = sceneUnit * factor;
      const left = side === 'left' ? 8 : width / 2 + menuWidth / 2 + 16;
      const available = side === 'left' ? sideWidth : Math.max(1, plotWidth - left - 8);
      const positionX = asset === 'whale' ? width / 2 + menuWidth / 2 + 8
        : asset === 'jerome' ? width / 2 - menuWidth / 2 - extent - 8
          : left + x * Math.max(0, available - extent);
      const candle = candles[Math.max(0, Math.min(count - 1, Math.round((positionX + extent / 2 - 2) / 4)))];
      const ground = Math.min(candle.open, candle.close);
      const grounded = ['bull', 'bear', 'ape', 'jerome', 'whale', 'printer'].includes(asset);
      const bird = ['hawk', 'pigeon', 'swan', 'white'].includes(asset);
      const lift = grounded ? 0 : bird ? extent * (1.4 + y) : extent * (0.3 + y);
      const positionY = asset === 'white'
        ? Math.min(plotHeight - volumeHeight - extent, ground + extent * 0.85)
        : Math.max(4, ground - extent - lift);
      const motion = characterMotion[asset];
      const speed = motion ? motion.speed * 60 * extent / GAME_SPRITE_SIZE * HOME_PACE : 0;
      return <foreignObject key={index} data-menu-asset={asset} data-grounded={grounded} data-candle-top={ground}
        data-moving={speed ? true : undefined}
        ref={node => {
          if (node && speed && motion) movers.current.set(index, { node, startX: positionX, startY: positionY, extent, lift, bird, speed, phaseRate: motion.phaseRate });
          else movers.current.delete(index);
        }}
        x={positionX} y={positionY} width={extent} height={extent}>
        {/* The ape runs right in the game; mirror it so it walks, not backpedals, leftwards. */}
        <div className="menu-character" style={asset === 'ape' ? { transform: 'scaleX(-1)' } : undefined}>
          <AssetPreview asset={asset} theme={theme} grounded={grounded} motionRate={motion?.phaseRate}
            animated={['coin', 'printer', 'tender', 'banana', 'banknote', 'diamond', 'bag', 'bell'].includes(asset)} />
        </div>
      </foreignObject>;
    })}
    </g>
    <g fill="var(--menu-chart-text, #52677d)" fontFamily="system-ui, monospace">
      {!portrait && priceTicks.map((y, index) => <text key={y} data-menu-price-label x={mobile ? plotWidth + priceColumnWidth / 2 : plotWidth + 5} textAnchor={mobile ? 'middle' : 'start'} y={y + 3} fontSize={9}>{150 - index * 10}</text>)}
      {timeTicks.filter(tick => tick.x >= 18 && tick.x <= plotWidth - 18).map(tick => <text key={tick.minute} x={tick.x} y={height - 5} fontSize={portrait ? 10 : 8} textAnchor="middle">{timeLabel(tick.minute)}</text>)}
    </g>
  </svg>;
}