// Keep Night event colours unchanged; use darker shades of the same hues
// on the white Day chart so event text remains readable.
const dayColors: Record<string, string> = {
  '#f8fafc': '#1e293b',
  '#fbbf24': '#856600', // Points / Hawk: dark amber.
  '#fde047': '#756500', // Apes: dark yellow.
  '#facc15': '#806800', // Paper Hands: dark gold.
  '#fb923c': '#a34b08', // KEK: dark orange.
  '#38bdf8': '#036b96', // Diamond / Whale / Good DD: dark sky blue.
  '#22c55e': '#15803d', // To the Moon: green.
};

export function popupColor(color: string, darkMode: boolean): string {
  return darkMode ? color : dayColors[color.toLowerCase()] ?? '#1e293b';
}