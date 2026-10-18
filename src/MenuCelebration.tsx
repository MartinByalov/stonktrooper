// Front-facing celebration pose in the same suit/skin palette as the game.
export function MenuCelebration({ theme }: { theme: 'light' | 'dark' }) {
  const caseColor = theme === 'dark' ? '#ffffff' : '#05070a';
  return <svg className="menu-celebration" viewBox="0 0 140 107.5" aria-hidden="true" focusable="false">
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M64 82L61 103M76 82L79 103" stroke="#27374e" strokeWidth="9" />
      <path d="M56 105H65M75 105H84" stroke="#111827" strokeWidth="5" />
      <path d="M59 55L44 42L32 22M81 55L96 42L108 22" fill="none" stroke="#27374e" strokeWidth="9" />
      <path d="M32 22L29 17M108 22L111 17" stroke="#efb58f" strokeWidth="7" />
      <path d="M59 52Q70 47 81 52L84 81Q70 88 56 81Z" fill="#27374e" stroke="#17202c" strokeWidth="1.5" />
      <path d="M64 51H76L70 77Z" fill="#f8fafc" />
      <path d="M66 51L70 56L74 51M70 56L67 69L70 74L73 69Z" fill="#ef4444" />
      <path d="M61 53L64 65L59 68L67 80M79 53L76 65L81 68L73 80" fill="none" stroke="#42536b" strokeWidth="1" />
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