// Browser game module for MenuHero.
export function MenuHero({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}images/${theme === 'dark' ? 'menu-hero-inverted.png' : 'menu-hero.png'}`}
      width={1024}
      height={1536}
      alt="Stonktrooper seated on a bench, viewed from behind, looking at constellations with his briefcase beside him"
      className="block w-full h-auto rounded-xl"
      onLoad={event => { event.currentTarget.style.display = ''; }}
      onError={event => { event.currentTarget.style.display = 'none'; }}
    />
  );
}