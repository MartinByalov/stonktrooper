// Front-facing celebration pose in the same suit/skin palette as the game.
export function MenuCelebration({ theme }: { theme: 'light' | 'dark' }) {
  const caseColor = theme === 'dark' ? '#ffffff' : '#05070a';
  return <svg className="menu-celebration" viewBox="0 0 140 107.5" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="menu-suit" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#293d60" /><stop offset="1" stopColor="#101a2d" />
      </linearGradient>
    </defs>
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M58 78H69L67 102H56ZM71 78H82L84 102H73Z" fill="url(#menu-suit)" stroke="#101a2d" />
      <path d="M55 102H66L67 106H51Q50 103 55 102ZM74 102H84Q89 103 89 106H73Z" fill="#101114" stroke="#05070a" />
      <path d="M54 104H62M78 104H84" stroke="#6b7280" strokeWidth="0.8" />
      <path d="M59 55L44 42L32 22M81 55L96 42L108 22" fill="none" stroke="url(#menu-suit)" strokeWidth="10" />
      <path d="M31 21L34 26M106 26L109 21" stroke="#f8fafc" strokeWidth="8" />
      <path d="M32 22L29 17M108 22L111 17" stroke="#efb58f" strokeWidth="7" />
      <path d="M59 52Q70 47 81 52L84 81Q76 86 70 79Q64 86 56 81Z" fill="url(#menu-suit)" stroke="#101a2d" strokeWidth="1.5" />
      <path d="M64 51H76L70 77Z" fill="#f8fafc" />
      <path d="M64 51L70 55L67 59ZM76 51L70 55L73 59Z" fill="#fff" stroke="#dce3ed" strokeWidth="0.5" />
      <path d="M68 54H72L73 58L71 60L74 73L70 78L66 73L69 60L67 58Z" fill="#f50024" />
      <path d="M61 52L60 59L63 60L59 64L68 79M79 52L80 59L77 60L81 64L72 79" fill="#1b2a45" stroke="#0d1627" strokeWidth="1" />
      <path d="M66 46V52H74V46" fill="#eab28e" />
      <ellipse cx="70" cy="35" rx="12" ry="14" fill="#fed7aa" stroke="#eab28e" strokeWidth="1.5" />
      <path d="M58 35Q54 32 56 39M82 35Q86 32 84 39" fill="none" stroke="#eab28e" strokeWidth="3" />
      <circle cx="65.5" cy="33" r="1.4" fill="#17202c" />
      <circle cx="74.5" cy="33" r="1.4" fill="#17202c" />
      <path d="M70 35L68.5 39H71" fill="none" stroke="#d49570" strokeWidth="1" />
      <path d="M65 42Q70 46 75 42" fill="none" stroke="#ad735c" strokeWidth="1.3" />
      <g transform="translate(29 17) rotate(-14)">
        <rect x="-17" y="7" width="34" height="22" rx="2" fill={caseColor} stroke="#64748b" />
        <path d="M-5 7V0H5V7" fill="none" stroke={caseColor} strokeWidth="3" />
        <path d="M-2 15H2V20H-2Z" fill={theme === 'dark' ? '#64748b' : '#ffffff'} />
        <path d="M-2 -2V1Q0 3 2 1V-2" fill="#efb58f" stroke="#d49570" strokeWidth="1" />
      </g>
      <g transform="translate(111 17) rotate(20)">
        <path d="M-2 0L1 -12Q7 -9 13 -12L20 0Z" fill={caseColor} stroke="#64748b" />
        <path d="M-1 -3H20" stroke="#94a3b8" strokeWidth="3" />
        <ellipse cx="10" rx="17" ry="3" fill={caseColor} stroke="#64748b" />
        <path d="M-2 -2V1Q0 3 2 1V-2" fill="#efb58f" stroke="#d49570" strokeWidth="1" />
      </g>
    </g>
  </svg>;
}