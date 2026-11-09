import { useEffect, useRef, useState } from 'react';
import type { Achievement } from './progression';
import { drawAchievementArtwork } from './achievementRenderer';
import { achievementImage } from './achievementImages';

export function AchievementArtwork({ art, id, theme }: { art: Achievement['art']; id: string; theme: 'light' | 'dark' }) {
  const src = achievementImage(id, theme);
  const [failedSrc, setFailedSrc] = useState<string>();
  return <span className="achievement-illustration" data-achievement-art={id} data-art-family={art}>
    {src && failedSrc !== src
      ? <img key={src} src={src} alt="" aria-hidden="true" width={64} height={64} decoding="async" onError={() => setFailedSrc(src)} />
      : <DrawnAchievementArtwork key={id} id={id} theme={theme} />}
  </span>;
}

function DrawnAchievementArtwork({ id, theme }: { id: string; theme: 'light' | 'dark' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, 192, 192);
    context.save();
    context.scale(3, 3);
    drawAchievementArtwork(context, id, theme === 'dark');
    context.restore();
  }, [id, theme]);
  return <canvas ref={canvas} width={192} height={192} aria-hidden="true" style={{ display: 'block', width: 64, height: 64 }} />;
}
