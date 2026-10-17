// Preserve event hues at night. Day popups use distinct, saturated dark
// event colours, rather than turning every yellow notification brown.
const dayColors: Record<string, string> = {
  '#f8fafc': '#1e293b',
  '#fbbf24': '#9a3412', // Points / Hawk: burnt orange.
  '#fde047': '#7e22ce', // Apes: violet.
  '#facc15': '#b91c1c', // Paper Hands: red.
  '#38bdf8': '#1d4ed8', // Diamond / Whale / Good DD: blue.
  '#22c55e': '#15803d', // To the Moon: green.
};

export function popupColor(color: string, darkMode: boolean): string {
  return darkMode ? color : dayColors[color.toLowerCase()] ?? '#1e293b';
}