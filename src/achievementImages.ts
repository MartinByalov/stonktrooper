// Filenames are kept explicit because achievement save IDs differ from titles.
// Add new artwork here when adding a file to public/achievements.
export const ACHIEVEMENT_IMAGES: Readonly<Record<string, string>> = {
  'no-title': 'no-title.webp',
  butterfingers: 'diamond-hands-butterfingers-compact.webp',
  'coin-flipper': 'technical-analysis-apparently.webp',
  stomp: 'hostile-feetover.webp',
  printer: 'quantitative-wheeeasing.webp',
  'paper-hands': 'paperhands.webp',
  bagholder: 'bagholder.webp',
  mage: 'what-are-you-a-mage.webp',
  'tender-enjoyer': 'tender-enjoyer.webp',
  apes: 'board-of-ape-directors.webp',
  'hat-collector': 'hat-collector.webp',
  'stick-around': 'stick-around.webp',
  'dumpster-enjoyer': 'dumbster-enjoyer.webp',
  'bull-market': 'bulldozer.webp',
  'bear-market': 'bear-buster.webp',
  'whale-rider': 'too-big-to-walk.webp',
  'emotional-baggage': 'emotional-baggage.webp',
  'all-time-high': 'all-time-high.webp',
  boss: 'your-rate-hike-has-been-declined.webp',
  'title-hedgelock': 'hedgelock.webp',
  'title-copiumancer': 'copiumancer.webp',
  'title-wickzard': 'wickzard.webp',
  'title-bagsquire': 'bagsquire.webp',
  'title-stonksworn': 'stonksworn.webp',
  'title-coinqueror': 'coinqueror.webp',
};

export const ACHIEVEMENT_NIGHT_IMAGES: Readonly<Record<string, string>> = {
  'no-title': 'no-title-inverted.webp',
  'all-time-high': 'all-time-high-inverted.webp',
  'dumpster-enjoyer': 'dumbster-enjoyer-inverted.webp',
  'hat-collector': 'hat-collector-inverted.webp',
  'stick-around': 'stick-around-inverted.webp',
  'tender-enjoyer': 'tender-enjoyer-inverted.webp',
  'whale-rider': 'too-big-to-walk-inverted.webp',
  boss: 'your-rate-hike-has-been-declined-inverted.webp',
  'title-hedgelock': 'hedgelock-inverted.webp',
  'title-copiumancer': 'copiumancer-inverted.webp',
  'title-wickzard': 'wickzard-inverted.webp',
  'title-bagsquire': 'bagsquire-inverted.webp',
  'title-stonksworn': 'stonksworn-inverted.webp',
  'title-coinqueror': 'coinqueror-inverted.webp',
};

export function achievementImage(id: string, theme: 'light' | 'dark'): string | undefined {
  const filename = (theme === 'dark' ? ACHIEVEMENT_NIGHT_IMAGES[id] : undefined) ?? ACHIEVEMENT_IMAGES[id];
  return filename ? `${import.meta.env.BASE_URL}achievements/${filename}` : undefined;
}