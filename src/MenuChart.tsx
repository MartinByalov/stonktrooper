import { useEffect, useRef, useState } from 'react';
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
  { asset: 'bear', side: 'right', x: 0.81, y: 0.74, size: 0.27 },
  { asset: 'jerome', side: 'right', x: 0.13, y: 0.70, size: 0.25 },
  { asset: 'bell', side: 'right', x: 0.96, y: 0.85, size: 0.13 },
];

export function MenuChart({ theme }: { theme: 'light' | 'dark' }) {
  const root = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 1040, height: 480 });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize(previous => previous.width === width && previous.height === height
          ? previous : { width, height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Render in CSS pixels: candles, volume and labels never stretch with the panel.
  const { width, height } = size;
  const plotWidth = Math.max(1, width - 54);
  const plotHeight = Math.max(1, height - 18);
  const volumeHeight = Math.min(28, plotHeight * 0.08);
  const menuWidth = Math.min(width * 0.34, 320);
  const sideWidth = Math.max(1, (width - menuWidth) / 2 - 24);
  const sceneUnit = Math.min(sideWidth, plotHeight * 0.46, 220);
  const priceHeight = Math.max(1, plotHeight - volumeHeight - 10);
  const count = Math.max(2, Math.floor(plotWidth / 4));
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
    return { x: 2 + index * 4, open, close, volume, upperWick, lowerWick };
  });
  const priceTicks = Array.from({ length: Math.max(1, Math.floor(priceHeight / 48)) }, (_, index) => 24 + index * 48);
  const timeStep = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotWidth / 70)) / 10)) * 10;
  // The menu is centred in the full panel, not the plot minus its price axis.
  const timeSpacing = timeStep * 4;
  const centerX = width / 2;
  const firstTick = Math.ceil(-centerX / timeSpacing);
  const lastTick = Math.floor((plotWidth - centerX) / timeSpacing);
  const centerMinute = Math.round(count / 2 / timeStep) * timeStep;
  const timeTicks = Array.from({ length: Math.max(0, lastTick - firstTick + 1) }, (_, index) => {
    const offset = firstTick + index;
    return { x: centerX + offset * timeSpacing, minute: centerMinute + offset * timeStep };
  });
  const timeLabel = (index: number) => {
    const minutes = ((9 * 60 + index) % 1440 + 1440) % 1440;
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  };

  return <svg ref={root} className="landing-menu-chart" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="landing-chart-plot"><rect width={plotWidth} height={plotHeight} /></clipPath>
    </defs>
    <rect width={width} height={height} fill="var(--menu-chart-bg, #ffffff)" />
    <g stroke="var(--menu-chart-grid, #d3dde780)" strokeWidth="1">
      {priceTicks.map(y => <path key={y} d={`M0 ${y}H${plotWidth}`} />)}
      {timeTicks.map(tick => <path key={tick.minute} d={`M${tick.x} 0V${plotHeight}`} />)}
      <path d={`M${plotWidth} 0V${height}M0 ${plotHeight}H${width}`} />
    </g>
    <g clipPath="url(#landing-chart-plot)">
    {candles.map((candle, index) => {
      const top = Math.min(candle.open, candle.close);
      const bottom = Math.max(candle.open, candle.close);
      const color = candle.close < candle.open ? '#08795c' : '#ef5350';
      return <g key={index} fill={color} stroke={color}>
        <rect x={candle.x - 1.3} y={plotHeight - candle.volume} width="2.6" height={candle.volume} opacity="0.27" stroke="none" />
        <path d={`M${candle.x} ${top - candle.upperWick}V${bottom + candle.lowerWick}`} strokeWidth="0.65" />
        <rect x={candle.x - 1.3} y={top} width="2.6" height={Math.max(1, bottom - top)} stroke="none" />
      </g>;
    })}
    {scenery.map(({ asset, side, x, y, size: factor }, index) => {
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
        ? Math.min(plotHeight - volumeHeight - extent, ground + extent * 0.25)
        : Math.max(4, ground - extent - lift);
      return <foreignObject key={index} data-menu-asset={asset} data-grounded={grounded} data-candle-top={ground}
        x={positionX} y={positionY} width={extent} height={extent}>
        <AssetPreview asset={asset} theme={theme} grounded={grounded} />
      </foreignObject>;
    })}
    </g>
    <g fill="var(--menu-chart-text, #52677d)" fontFamily="system-ui, monospace">
      {priceTicks.map(y => <text key={y} x={plotWidth + 5} y={y + 3} fontSize="9">{(150 - y / priceHeight * 120).toFixed(2)}</text>)}
      {timeTicks.filter(tick => tick.x >= 18 && tick.x <= plotWidth - 18).map(tick => <text key={tick.minute} x={tick.x} y={height - 5} fontSize="8" textAnchor="middle">{timeLabel(tick.minute)}</text>)}
    </g>
  </svg>;
}