import { useLayoutEffect, useRef } from 'react';

export function MenuQuote({ liveFeedEnabled }: { liveFeedEnabled: boolean }) {
  const quote = useRef<HTMLQuoteElement>(null);
  useLayoutEffect(() => {
    const element = quote.current;
    const actions = element?.parentElement;
    const app = actions?.closest('.game-app');
    const heroes = actions?.querySelectorAll('.menu-celebration');
    const header = app?.querySelector('header');
    const feed = app?.querySelector('.desktop-live-feed-bar');
    const donateHero = app?.querySelector('.donate-home-art .desktop-home-art');
    if (!element || !actions || !app || !heroes?.length || !header) return;
    const layout = () => {
      const feedRect = feed?.getBoundingClientRect();
      const top = liveFeedEnabled && feedRect && feedRect.height > 0
        ? feedRect.bottom : header.getBoundingClientRect().bottom;
      const windowedLandscape = !document.fullscreenElement && window.matchMedia('(pointer: coarse) and (orientation: landscape)').matches;
      const hero = windowedLandscape ? donateHero : Array.from(heroes).find(candidate => candidate.getClientRects().length > 0);
      if (!hero) return;
      const bottom = hero.getBoundingClientRect().top;
      element.style.top = `${(top + bottom) / 2 - actions.getBoundingClientRect().top}px`;
      const donate = app.querySelector('.home-coffee-link')?.getBoundingClientRect();
      element.style.left = windowedLandscape && donate ? `${donate.left + donate.width / 2 - actions.getBoundingClientRect().left}px` : '';
      element.style.maxWidth = windowedLandscape && donate ? `${Math.max(1, donate.left + donate.width / 2) * 2 - 8}px` : '';
    };
    const observer = new ResizeObserver(layout);
    for (const target of [app, actions, ...heroes, donateHero, header, feed]) if (target) observer.observe(target);
    for (let parent = actions.parentElement; parent && parent !== app; parent = parent.parentElement) observer.observe(parent);
    // Parent layout effects can reposition the menu after the child's first measurement.
    const frame = requestAnimationFrame(layout);
    window.addEventListener('resize', layout);
    app.addEventListener('hudlayoutchange', layout);
    document.addEventListener('fullscreenchange', layout);
    layout();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', layout);
      app.removeEventListener('hudlayoutchange', layout);
      document.removeEventListener('fullscreenchange', layout);
    };
  }, [liveFeedEnabled]);
  return <blockquote ref={quote} className="landing-menu-quote"><em>“Next time for sure!”</em>{' '}<span>- Regard</span></blockquote>;
}