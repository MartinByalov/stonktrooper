// Decorative original vector scene; no external image assets.
export function LiquidatedBackdrop({ day = false }: { day?: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 440 360" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none">
      <rect width="440" height="360" fill="#101b2b" />
      <circle cx="360" cy="42" r="37" fill="#d5e7f3" opacity="0.08" />
      <g fill="#213247" opacity="0.65">
        <path d="M0 300V250H35V274H62V225H105V300ZM330 360V260H365V232H401V280H440V360Z" />
      </g>
      <g stroke={day ? '#e7ad58' : '#cc9a56'} strokeWidth="2" fill="none" opacity={day ? 0.95 : 0.9}>
        <path d="M312 360V89H340V360M312 89L340 125L312 162L340 199L312 236L340 273L312 310L340 347" />
        <path d="M52 89H408V107H52ZM52 107L89 89L126 107L163 89L200 107L237 89L274 107L311 89L348 107L385 89" />
        <path d="M326 37L52 89M326 37L408 89M326 37V89M98 107V188" />
        <path d="M98 188V199Q98 208 107 202" strokeWidth="3" />
        <path d="M0 122Q125 148 250 122T440 125" opacity="0.6" />
      </g>
      {[{ x: 135, y: 86, flip: 1 }, { x: 216, y: 86, flip: -1 }, { x: 284, y: 86, flip: 1 }].map(({ x, y, flip }) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${flip} 1)`}>
          <path d="M-7 -8L-24 -3L-13 -15Z" fill="#647d89" />
          <ellipse cy="-15" rx="12" ry="15" fill={day ? '#f2dc56' : '#e6cf50'} />
          <path d="M-9 -25Q-19 -14 -7 -7L2 -11L-1 -25Z" fill={day ? '#68abd0' : '#609bc0'} />
          <path d="M-11 -18L-2 -15M-10 -13L-2 -11" stroke="#b3c7ce" strokeWidth="1.5" />
          <path d="M2 -27L3 -3" stroke="#263c40" strokeWidth="3" />
          <circle cx="5" cy="-30" r="9" fill="#182a34" />
          <ellipse cx="9" cy="-28" rx="5" ry="4" fill="#edf0dd" />
          <circle cx="10" cy="-33" r="1.3" fill="#ffffff" />
          <path d="M13 -30L20 -28L13 -26Z" fill="#6d7b80" />
          <path d="M-4 -2V2H-8M5 -2V2H9" stroke="#8b938d" strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <rect y="115" width="440" height="245" fill="#101b2b" opacity="0.45" />
    </svg>
  );
}