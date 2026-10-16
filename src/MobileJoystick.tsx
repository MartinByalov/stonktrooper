// Browser game module for MobileJoystick.
import { useRef, useState } from 'react';

export function MobileJoystick({ onMove, onPress, onRelease, movementEnabled }: {
  onMove: (x: number, y: number) => void;
  onPress: () => void;
  onRelease: () => void;
  movementEnabled: boolean;
}) {
  const pointer = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reset = () => {
    if (pointer.current === null) return;
    pointer.current = null;
    setOffset({ x: 0, y: 0 }); onMove(0, 0); onRelease();
  };
  return <div
    role="button" aria-label={movementEnabled ? 'Joystick: tap to jump, drag to move' : 'Joystick: tap to jump'} tabIndex={0}
    className="mobile-joystick absolute bottom-4 left-4 z-50 flex items-center justify-center rounded-full touch-none select-none pointer-events-auto min-[1025px]:hidden"
    onPointerDown={e => {
      e.preventDefault(); e.stopPropagation();
      if (pointer.current !== null) return;
      pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); onPress();
    }}
    onPointerMove={e => {
      if (pointer.current !== e.pointerId) return;
      e.preventDefault(); e.stopPropagation();
      if (!movementEnabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const dx = e.clientX - rect.left - rect.width / 2;
      const dy = e.clientY - rect.top - rect.height / 2;
       const radius = rect.width * 0.29, length = Math.hypot(dx, dy);
      const scale = length > radius ? radius / length : 1;
      const x = dx * scale, y = dy * scale;
      setOffset({ x, y }); onMove(x / radius, y / radius);
    }}
    onPointerUp={e => { e.stopPropagation(); if (pointer.current === e.pointerId) reset(); }}
    onPointerCancel={reset} onLostPointerCapture={reset}
    onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); onPress(); } }}
    onKeyUp={onRelease}
  ><span className="mobile-joystick-knob rounded-full" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} /></div>;
}