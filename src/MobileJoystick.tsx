// Browser game module for MobileJoystick.
import { useRef, useState } from 'react';
import { joystickSwipe } from './joystickGesture';

export function MobileJoystick({ onMove, onPress, onRelease, movementEnabled }: {
  onMove: (x: number, y: number) => void;
  onPress: () => void;
  onRelease: () => void;
  movementEnabled: boolean;
}) {
  const pointer = useRef<number | null>(null);
  const gesture = useRef({ startY: 0, latched: false });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reset = () => {
    if (pointer.current === null) return;
    pointer.current = null;
    gesture.current.latched = false;
    setOffset({ x: 0, y: 0 }); onMove(0, 0); onRelease();
  };
  return <div
    role="button" aria-label={movementEnabled ? 'Joystick: drag to move, swipe up or tap to jump' : 'Joystick: tap to jump'} tabIndex={0}
    className="mobile-joystick absolute bottom-4 left-4 z-50 flex items-center justify-center rounded-full touch-none select-none pointer-events-auto"
    onPointerDown={e => {
      e.preventDefault(); e.stopPropagation();
      if (pointer.current !== null) return;
      pointer.current = e.pointerId;
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
      setOffset({ x, y }); onMove(x / radius, y / radius);
    }}
    onPointerUp={e => { e.stopPropagation(); if (pointer.current === e.pointerId) reset(); }}
    onPointerCancel={reset} onLostPointerCapture={reset}
    onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); onPress(); } }}
    onKeyUp={onRelease}
  >{movementEnabled && <span className="mobile-joystick-knob rounded-full" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} />}</div>;
}