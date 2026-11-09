// Browser game module for MenuHero.
export function MenuHero({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'menu-hero-inverted' : 'menu-hero'}.webp`}
      srcSet={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'menu-hero-inverted' : 'menu-hero'}-small.webp 640w, ${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'menu-hero-inverted' : 'menu-hero'}.webp 1024w`}
      sizes="(max-width: 640px) 100vw, 400px"
      width={1024}
      height={1536}
      alt="Stonktrooper seated on a bench, viewed from behind, looking at constellations with his briefcase beside him"
      className="block w-full h-auto rounded-xl"
      onLoad={event => { event.currentTarget.style.display = ''; }}
      onError={event => { event.currentTarget.style.display = 'none'; }}
    />
  );
}