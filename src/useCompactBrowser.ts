import { useEffect, useState } from 'react';

// A phone held sideways while the browser bars are still showing leaves very little height.
// In that state the Live Feed bar gives way to the game; fullscreen brings it back.
export function useCompactBrowser(enabled: boolean) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!enabled) { setCompact(false); return; }
    const read = () => setCompact(window.matchMedia('(pointer: coarse)').matches
      && window.innerWidth > window.innerHeight && !document.fullscreenElement);
    read();
    window.addEventListener('resize', read);
    screen.orientation?.addEventListener('change', read);
    document.addEventListener('fullscreenchange', read);
    return () => {
      window.removeEventListener('resize', read);
      screen.orientation?.removeEventListener('change', read);
      document.removeEventListener('fullscreenchange', read);
    };
  }, [enabled]);
  return compact;
}
