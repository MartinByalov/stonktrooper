// Native file sharing is attempted before any asynchronous clipboard action.
import { formatShareScore } from './shareCard';

export async function shareScoreImage(file: File, score: number, url: string, browser: Pick<Navigator, 'share' | 'canShare'>): Promise<boolean> {
  const data: ShareData = {
    title: 'Stonktrooper — Best Score',
    text: `My best score: ${formatShareScore(score)}`,
    url,
    files: [file],
  };
  if (!browser.share || !browser.canShare || !browser.canShare({ files: [file] }) || !browser.canShare(data)) return false;
  await browser.share(data);
  return true;
}