// Encode shareable, self-reported results without a backend or score upload.
import { formatShareScore } from './shareCard';

export function resultUrl(score: number): string {
  const url = new URL('https://www.stonktrooper.lol/');
  url.searchParams.set('score', String(Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(score) ? score : 0)))));
  return url.href;
}

export function sharedScore(search: string): number | null {
  const value = new URLSearchParams(search).get('score');
  if (value === null || !/^\d{1,16}$/.test(value)) return null;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? score : null;
}

export function socialLinks(score: number) {
  const url = resultUrl(score);
  const text = `My Stonktrooper best score: ${formatShareScore(score)}. Can you beat it?`;
  return [
    { name: 'Telegram', href: `https://t.me/share/url?${new URLSearchParams({ url, text })}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url })}` },
  ];
}