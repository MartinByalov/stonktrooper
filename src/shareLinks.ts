// Encode shareable, self-reported results without a backend or score upload.
import { formatShareScore } from './shareCard';

export function resultUrl(score: number, challenger?: string): string {
  const url = new URL('https://www.stonktrooper.lol/');
  url.searchParams.set('score', String(Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(score) ? score : 0)))));
  if (challenger !== undefined) {
    url.searchParams.set('challenge', '1');
    url.searchParams.set('challenger', challengeName(challenger));
  }
  return url.href;
}

export function sharedScore(search: string): number | null {
  const value = new URLSearchParams(search).get('score');
  if (value === null || !/^\d{1,16}$/.test(value)) return null;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? score : null;
}

function challengeName(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 48) || 'Challenger';
}

// Public links are self-reported challenges, not authenticated player identities.
export function sharedChallenge(search: string): { name: string; score: number } | null {
  if (search.length > 2048) return null;
  const params = new URLSearchParams(search);
  if (params.get('challenge') !== '1' || params.getAll('challenge').length !== 1
    || params.getAll('score').length !== 1 || params.getAll('challenger').length !== 1) return null;
  const score = sharedScore(search);
  const name = params.get('challenger');
  if (score === null || name === null || name.length > 48 || challengeName(name) !== name) return null;
  return { name, score };
}

export function socialLinks(score: number, challenger?: string) {
  const url = resultUrl(score, challenger);
  const text = challenger === undefined
    ? `My Stonktrooper best score: ${formatShareScore(score)}. Can you beat it?`
    : `Stonktrooper Challenge: can you beat ${formatShareScore(score)}?`;
  return [
    { name: 'Telegram', href: `https://t.me/share/url?${new URLSearchParams({ url, text })}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?${new URLSearchParams({ text, url })}` },
  ];
}