import { useEffect, useRef, useState } from 'react';

export function ReviveCountdown({ onExpire }: { onExpire: () => void }) {
  const expire = useRef(onExpire);
  expire.current = onExpire;
  const [remaining, setRemaining] = useState(1);
  useEffect(() => {
    const deadline = Date.now() + 10_000;
    let finished = false;
    const tick = () => {
      const fraction = Math.max(0, (deadline - Date.now()) / 10_000);
      setRemaining(fraction);
      if (!fraction && !finished) { finished = true; expire.current(); }
    };
    const timer = setInterval(tick, 50);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  return <span className="revive-countdown-fill" aria-hidden="true" style={{ transform: `scaleX(${remaining})` }} />;
}