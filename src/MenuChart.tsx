import { useEffect, useRef, useState } from 'react';
import { MenuRunner } from './MenuRunner';
import { gameView } from './gameView';
import { CHART_HEIGHT } from './chartChrome';
import { marketClockLabel, marketClockStep } from './marketClock';
import { SKINS, skinColors } from './progression';
import { candleGlyph } from './candleDesign';
import { menuPetSurfaceOffset } from './track';

export function MenuChart({ theme, animationsEnabled, candleSkin = 'candles-classic', hatSkin = 'hats-classic', suitcaseSkin = 'suitcase-classic', suitSkin = 'suits-classic', shoeSkin = 'shoes-classic', petSkin }: { theme: 'light' | 'dark'; animationsEnabled: boolean; candleSkin?: string; hatSkin?: string; suitcaseSkin?: string; suitSkin?: string; shoeSkin?: string; petSkin?: string }) {
  const [bullColor, bearColor] = skinColors(candleSkin, theme === 'dark');
  const chartType = SKINS.find(skin => skin.id === candleSkin)?.chart;
  const root = useRef<SVGSVGElement>(null);
  const market = useRef<SVGGElement>(null);
  const volume = useRef<SVGGElement>(null);
  const priceScale = useRef<SVGGElement>(null);
  const timeScale = useRef<SVGGElement>(null);
  const currentPrice = useRef<SVGGElement>(null);
  const petSurface = useRef<((offset: number) => number) | null>(null);
  const [size, setSize] = useState({ width: 1040, height: 480, portrait: false, mobile: false, actionsLeft: 0 });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      const { width, height } = bounds;
      const actions = element.parentElement?.querySelector('.landing-menu-actions')?.getBoundingClientRect();
      const actionsLeft = actions ? Math.max(0, actions.left - bounds.left) : 0;
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
      if (width > 0 && height > 0) {
        setSize(previous => previous.width === width && previous.height === height
          && previous.portrait === portrait && previous.mobile === mobile && previous.actionsLeft === actionsLeft
          ? previous : { width, height, portrait, mobile, actionsLeft });
      }
    });
    observer.observe(element);
    for (const child of element.parentElement?.querySelectorAll('.landing-menu-actions, .home-coffee-link') ?? []) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, []);

  // Render in CSS pixels: candles, volume and labels never stretch with the panel.
  const { width, height, portrait } = size;
  const view = gameView(size);
  const worldScale = CHART_HEIGHT / view.height;
  const candleScale = view.scale;
  const candleWidth = (portrait ? 4.8 : 3.5) * candleScale;
  const axisWidth = portrait ? 0 : view.axisWidth * view.scale;
  const plotWidth = Math.max(1, width - axisWidth);
  // Put portrait's outer candle centres on the screen edges so neither side has an empty gutter.
  const portraitIntervals = Math.max(1, Math.ceil(plotWidth / (6 * candleScale)));
  const candleSpacing = portrait ? plotWidth / portraitIntervals : 5.4 * candleScale;
  const plotHeight = Math.max(1, height - view.timeAxisHeight * view.scale);
  const volumeHeight = Math.min(38, plotHeight * 0.11);
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
    const volatility = priceHeight * (0.004 + random() * 0.012) * worldScale;
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
  // Remove end-to-start drift so repeated market segments join continuously.
  const drift = candles[count - 1].close - candles[0].open;
  candles.forEach((candle, index) => {
    candle.open -= drift * index / count;
    candle.close -= drift * (index + 1) / count;
  });
  const surfaceTops=candles.map((candle,index)=>{
    const previous=candles[Math.max(0,index-1)];
    const glyph=candleGlyph(candleSkin,candle.open,candle.close,Math.min(candle.open,candle.close)-candle.upperWick,Math.max(candle.open,candle.close)+candle.lowerWick,previous.open,previous.close);
    return Math.min(glyph.open,glyph.close);
  });
  const priceTickSpacing = 50 * view.scale;
  // Home has its own larger presentation; gameplay camera anchors stay untouched.
  const groupWidth = petSkin ? 136 : 72;
  const heroScale = !portrait && size.actionsLeft > 0
    ? Math.min(view.scale * 1.35, Math.max(1, size.actionsLeft - 16) / groupWidth, plotHeight / 125)
    : view.scale;
  // The hero alone sits midway between the screen edge and the buttons; the hat is 4 units right.
  const heroX = !portrait && size.actionsLeft > 0
    ? size.actionsLeft / 2 - 4 * heroScale
    : view.heroX * view.scale;
  const heroIndex = Math.max(0, Math.min(count - 1, Math.round((heroX - 2) / candleSpacing)));
  const heroCandle = candles[heroIndex];
  // Use the gameplay feet anchor and move the market underneath so the runner stands on a candle.
  const heroY = view.heroY * view.scale;
  const terrainShift = heroY - surfaceTops[heroIndex];
  const candleOffsetX = heroX - heroCandle.x;
  const priceTicks = Array.from({ length: Math.ceil(height * 3 / priceTickSpacing) }, (_, index) => -height + index * priceTickSpacing);
  const timeStep = marketClockStep(candleSpacing, 50);
  // The menu is centred in the full panel, not the plot minus its price axis.
  const timeSpacing = timeStep * candleSpacing;
  const centerX = width / 2;
  const firstTick = Math.floor(-centerX / timeSpacing) - 1;
  const lastTick = Math.ceil((plotWidth - centerX) / timeSpacing) + 1;
  const centerMinute = portrait ? 4 * 60 + 20 : Math.round(count / 2 / timeStep) * timeStep;
  const timeTicks = Array.from({ length: Math.max(0, lastTick - firstTick + 1) }, (_, index) => {
    const offset = firstTick + index;
    return { x: centerX + offset * timeSpacing, minute: centerMinute + offset * timeStep };
  });

  useEffect(() => {
    const element = market.current;
    if (!element) return;
    const animate = animationsEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cycle = count * candleSpacing;
    const timeLabels = Array.from(timeScale.current?.querySelectorAll('text') ?? []);
    let frame = 0, previous = 0, distance = 0;
    const draw = (now: number) => {
      if (previous && !document.hidden) distance = (distance + Math.min(now - previous, 50) * 0.024) % cycle;
      previous = now;
      const position = heroIndex + distance / candleSpacing;
      const index = Math.floor(position) % count;
      const next = (index + 1) % count;
      const fraction = position % 1;
      const surface = surfaceTops[index] * (1 - fraction) + surfaceTops[next] * fraction;
      petSurface.current=offset=>menuPetSurfaceOffset(surfaceTops,position,offset,heroScale,candleSpacing);
      const shiftY = heroY - surface - terrainShift;
      element.setAttribute('transform', `translate(${-distance} ${shiftY})`);
      volume.current?.setAttribute('transform', `translate(${-distance} 0)`);
      priceScale.current?.setAttribute('transform', `translate(0 ${shiftY})`);
      timeScale.current?.setAttribute('transform', `translate(${-distance % timeSpacing} 0)`);
      const elapsedTicks = Math.floor(distance / timeSpacing) * timeStep;
      timeLabels.forEach((label, index) => { label.textContent = marketClockLabel(timeTicks[index].minute + elapsedTicks); });
      const close = candles[index].close * (1 - fraction) + candles[next].close * fraction;
      const lineY = close + terrainShift + shiftY;
      currentPrice.current?.setAttribute('transform', `translate(0 ${lineY})`);
      const bullish = candles[index].close < candles[index].open;
      currentPrice.current?.setAttribute('data-direction', bullish ? 'up' : 'down');
      currentPrice.current?.querySelector('rect')?.setAttribute('fill', bullish ? bullColor : bearColor);
      const priceText = currentPrice.current?.querySelector('text');
      if (priceText) priceText.textContent = (150 - close / priceTickSpacing * 10).toFixed(2);
      element.dataset.scroll = String(distance);
      if (animate) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [width, height, animationsEnabled, bullColor, bearColor, candleSkin]);

  return <svg ref={root} className="landing-menu-chart" data-layout={portrait ? 'portrait' : 'landscape'} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="landing-chart-plot"><rect width={plotWidth} height={plotHeight} /></clipPath>
      <clipPath id="landing-price-scale"><rect x={plotWidth} width={axisWidth} height={plotHeight} /></clipPath>
      <clipPath id="landing-time-scale"><rect y={plotHeight} width={plotWidth} height={height - plotHeight} /></clipPath>
    </defs>
    <rect width={width} height={height} fill="var(--menu-chart-bg, #ffffff)" />
    <g stroke="var(--menu-chart-grid, #d3dde780)" strokeWidth="1">
      {/* Overscan ticks must not draw through the price column. */}
      <g className="menu-chart-grid" clipPath="url(#landing-chart-plot)">
        {priceTicks.map(y => <path key={y} d={`M0 ${y}H${plotWidth}`} />)}
        {timeTicks.map(tick => <path key={tick.minute} d={`M${tick.x} 0V${plotHeight}`} />)}
      </g>
      {!portrait && <path d={`M${plotWidth} 0V${height}`} />}
      <path d={`M0 ${plotHeight}H${width}`} />
    </g>
    <g clipPath="url(#landing-chart-plot)">
    <g ref={volume} className="menu-moving-volume">
      {[-1, 0, 1].map(copy => <g key={copy} transform={`translate(${copy * count * candleSpacing} 0)`}>{candles.map((candle, index) => <rect key={index}
        x={candle.x + candleOffsetX - candleWidth / 2} y={plotHeight - candle.volume} width={candleWidth} height={candle.volume}
        fill={candle.close < candle.open ? bullColor : bearColor} opacity="0.27" />)}</g>)}
    </g>
    <g ref={market} className="menu-moving-market">
    {[-1, 0, 1].map(copy => <g key={copy} transform={`translate(${copy * count * candleSpacing} 0)`}>{candles.map((candle, index) => {
      const previous = candles[Math.max(0, index - 1)];
      const glyph = candleGlyph(candleSkin, candle.open, candle.close, Math.min(candle.open, candle.close) - candle.upperWick, Math.max(candle.open, candle.close) + candle.lowerWick, previous.open, previous.close);
      const top = Math.min(glyph.open, glyph.close) + terrainShift;
      const bottom = Math.max(glyph.open, glyph.close) + terrainShift;
      const x = candle.x + candleOffsetX;
       const color = glyph.bullish ? bullColor : bearColor;
      return <g key={index} fill={color} stroke={color}>
        {chartType === 'renko' ? Array.from({ length: Math.max(1, Math.ceil((bottom - top) / candleWidth)) }, (_, brick) => <rect key={brick} x={x - candleWidth / 2} y={top + brick * candleWidth} width={candleWidth} height={Math.max(1, Math.min(candleWidth, bottom - top - brick * candleWidth) - .5)} stroke="none" />) : <>
          <path d={`M${x} ${glyph.high + terrainShift}V${glyph.low + terrainShift}`} strokeWidth="0.65" />
          {chartType === 'ohlc' ? <path d={`M${x - candleWidth / 2} ${glyph.open + terrainShift}H${x}M${x} ${glyph.close + terrainShift}h${candleWidth / 2}`} fill="none" />
            : <rect x={x - candleWidth / 2} y={top} width={candleWidth} height={Math.max(1, bottom - top)} fill={chartType === 'hollow' && glyph.bullish ? 'none' : color} stroke={chartType === 'hollow' && glyph.bullish ? color : 'none'} strokeWidth=".65" />}
        </>}
      </g>;
    })}</g>)}
    </g>
    <foreignObject className="menu-runner-anchor" data-candle-x={heroX} data-candle-top={heroY} data-world-scale={heroScale}
      x={heroX - (petSkin ? 88 : 24) * heroScale} y={heroY - 164 * heroScale} width={(petSkin ? 136 : 72) * heroScale} height={268 * heroScale}>
      <MenuRunner theme={theme} scale={heroScale} topPadding={80} bottomPadding={100} petSurface={petSurface} animationsEnabled={animationsEnabled} hatSkin={hatSkin} suitcaseSkin={suitcaseSkin} suitSkin={suitSkin} shoeSkin={shoeSkin} petSkin={petSkin} />
    </foreignObject>
    </g>
    <g fill="var(--menu-chart-text, #52677d)" fontFamily="system-ui, monospace">
      <g clipPath="url(#landing-price-scale)">
        <g ref={priceScale} className="menu-moving-price-scale">{!portrait && priceTicks.map(y => <text className="menu-price-label" key={y}
          transform={`translate(${plotWidth + 6} ${y + 4})`}
          fontSize={11} fontWeight="bold">{(150 - (y - terrainShift) / priceTickSpacing * 10).toFixed(2)}</text>)}</g>
        <g ref={currentPrice} className="menu-current-price" data-direction={heroCandle.close < heroCandle.open ? 'up' : 'down'} transform={`translate(0 ${heroY})`}>
          <rect x={plotWidth} y={-12} width={axisWidth} height={24} fill={heroCandle.close < heroCandle.open ? bullColor : bearColor} />
          <text transform={`translate(${plotWidth + 6} 4)`} fontSize={11} fontWeight="bold" fill="#fff">150.00</text>
        </g>
      </g>
      <g clipPath="url(#landing-time-scale)"><g ref={timeScale} className="menu-moving-time-scale">{timeTicks.map(tick => <text className="menu-time-label" key={tick.minute}
        transform={`translate(${tick.x} ${height - 4})`} fontSize={10} textAnchor="middle">{marketClockLabel(tick.minute)}</text>)}</g></g>
    </g>
  </svg>;
}