import { useEffect, useRef, useState } from 'react';
import { drawShareCard, formatShareScore, shareCardBackground, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from './shareCard';

export function LandingScore({ score, theme }: { score: number; theme: 'light' | 'dark' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      drawShareCard(ctx, score, image, theme);
      setLoaded(true);
    };
    image.src = shareCardBackground(theme, import.meta.env.BASE_URL);
    return () => { cancelled = true; };
  }, [score, theme]);

  return <figure className="landing-score" aria-label={`Shared best score: ${formatShareScore(score)}`}>
    <canvas ref={canvas} width={SHARE_CARD_WIDTH} height={SHARE_CARD_HEIGHT} role="img"
      aria-label={`Stonktrooper holding a briefcase with best score ${formatShareScore(score)}`} hidden={!loaded} />
    {!loaded && <p className="landing-score-fallback">Shared best score: <strong>{formatShareScore(score)}</strong></p>}
  </figure>;
}