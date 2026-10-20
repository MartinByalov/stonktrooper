// Decorative artwork follows the document theme, including fullscreen mode.
export function LiquidatedBackdrop({ theme, shareOpen = false }: { theme: 'light' | 'dark'; shareOpen?: boolean }) {
  const name = `crane${theme === 'dark' ? '-inverted' : ''}`;
  const portrait = `crane-portrait${theme === 'dark' ? '-inverted' : ''}`;
  const base = `${import.meta.env.BASE_URL}images/`;
  return (
    <div aria-hidden="true" className="liquidated-backdrop absolute inset-0 w-full h-full pointer-events-none">
      <picture style={{ display: 'contents' }}>
        {shareOpen && <source media="(pointer: coarse) and (orientation: portrait)" srcSet={`${base}${portrait}-small.webp 540w, ${base}${portrait}.webp 941w`} sizes="100vw" />}
        <img src={`${base}${name}.webp`} srcSet={`${base}${name}-small.webp 960w, ${base}${name}.webp ${theme === 'dark' ? 1916 : 1905}w`} sizes="100vw" fetchPriority="high" alt="" draggable={false} />
      </picture>
    </div>
  );
}
