import { useLayoutEffect, useRef } from 'react';

export function MenuQuote({ liveFeedEnabled }: { liveFeedEnabled: boolean }) {
  const quote = useRef<HTMLQuoteElement>(null);
  useLayoutEffect(() => {
    const element = quote.current;
    const actions = element?.parentElement;
    const app = actions?.closest('.game-app');
    const hero = actions?.querySelector('.menu-celebration');
    const header = app?.querySelector('header');
    const feed = app?.querySelector('.desktop-live-feed-bar');
    if (!element || !actions || !app || !hero || !header) return;
    const layout = () => {
      const feedRect = feed?.getBoundingClientRect();
      const top = liveFeedEnabled && feedRect && feedRect.height > 0
        ? feedRect.bottom : header.getBoundingClientRect().bottom;
      const bottom = hero.getBoundingClientRect().top;
      element.style.top = `${(top + bottom) / 2 - actions.getBoundingClientRect().top}px`;
    };
    const observer = new ResizeObserver(layout);
    for (const target of [app, actions, hero, header, feed]) if (target) observer.observe(target);
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