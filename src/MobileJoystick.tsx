// Browser game module for MobileJoystick.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { joystickSwipe } from './joystickGesture';

export function MobileJoystick({ onMove, onPress, onRelease, movementEnabled }: {
  onMove: (x: number, y: number) => void;
  onPress: () => void;
  onRelease: () => void;
  movementEnabled: boolean;
}) {
  const pointer = useRef<number | null>(null);
  const control = useRef<HTMLDivElement>(null);
  const keyboardPressed = useRef(false);
  const gesture = useRef({ startY: 0, latched: false });
  const knob = useRef<HTMLSpanElement>(null);
  const callbacks = useRef({ onMove, onRelease });
  useLayoutEffect(() => { callbacks.current = { onMove, onRelease }; });
  useEffect(() => {
    const release = () => {
      if (pointer.current === null && !keyboardPressed.current) return;
      pointer.current = null;
      keyboardPressed.current = false;
      control.current?.removeAttribute('data-pressed');
      gesture.current.latched = false;
      if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
      callbacks.current.onMove(0, 0);
      callbacks.current.onRelease();
    };
    const visibility = () => { if (document.hidden) release(); };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', visibility);
      release();
    };
  }, []);
  const reset = () => {
    if (pointer.current === null) return;
    pointer.current = null;
    control.current?.removeAttribute('data-pressed');
    gesture.current.latched = false;
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
    onMove(0, 0); onRelease();
  };
  return <div
    ref={control}
    role="button" aria-label={movementEnabled ? 'Joystick: drag to move, swipe up or tap to jump' : 'Joystick: tap to jump'} tabIndex={0}
    className="mobile-joystick absolute bottom-4 left-4 z-50 flex items-center justify-center rounded-full touch-none select-none pointer-events-auto"
    onPointerDown={e => {
      e.preventDefault(); e.stopPropagation();
      if (pointer.current !== null) return;
      pointer.current = e.pointerId;
      e.currentTarget.setAttribute('data-pressed', 'true');
      gesture.current = { startY: e.clientY, latched: false };
      e.currentTarget.setPointerCapture(e.pointerId); onPress();
    }}
    onPointerMove={e => {
      if (pointer.current !== e.pointerId) return;
      e.preventDefault(); e.stopPropagation();
      if (!movementEnabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = e.clientX - rect.left - rect.width / 2;
      const dy = e.clientY - rect.top - rect.height / 2;
      const radius = rect.width * 0.29, length = Math.hypot(dx, dy);
      const swipe = joystickSwipe(gesture.current.startY - e.clientY, radius, gesture.current.latched);
      gesture.current.latched = swipe.latched;
      if (swipe.jump) onPress();
      const scale = length > radius ? radius / length : 1;
      const x = dx * scale, y = dy * scale;
      if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
      onMove(x / radius, y / radius);
    }}
    onPointerUp={e => { e.stopPropagation(); if (pointer.current === e.pointerId) reset(); }}
    onPointerCancel={reset} onLostPointerCapture={reset}
    onKeyDown={e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        keyboardPressed.current = true;
        e.currentTarget.setAttribute('data-pressed', 'true');
        onPress();
      }
    }}
    onKeyUp={e => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      keyboardPressed.current = false;
      if (pointer.current === null) e.currentTarget.removeAttribute('data-pressed');
      onRelease();
    }}
    onBlur={e => {
      if (!keyboardPressed.current) return;
      keyboardPressed.current = false;
      if (pointer.current === null) e.currentTarget.removeAttribute('data-pressed');
      onRelease();
    }}
  >{movementEnabled && <span className="mobile-joystick-knob rounded-full" ref={knob} />}</div>;
}