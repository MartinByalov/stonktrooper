export type RunKills = { bull: number; bear: number };

// Front-facing bull and bear heads with cross eyes, so they read as defeated enemies.
export function DefeatedHead({ enemy }: { enemy: keyof RunKills }) {
  const bear = enemy === 'bear';
  const fur = bear ? '#784c28' : '#883a24';
  return <svg viewBox="0 0 36 32" aria-hidden="true" focusable="false">
    {bear ? <g fill={fur} stroke="#392518" strokeWidth="1">
      <circle cx="8" cy="8" r="6" /><circle cx="28" cy="8" r="6" />
      <g fill="#b48a60"><circle cx="8" cy="8" r="3" /><circle cx="28" cy="8" r="3" /></g>
    </g> : <g fill="#e8d9b5" stroke="#634e36" strokeWidth="1">
      <path d="M10 13 Q0 12 2 1 Q5 8 13 7Z" /><path d="M26 13 Q36 12 34 1 Q31 8 23 7Z" />
    </g>}
    <ellipse cx="18" cy="18" rx="13" ry="12" fill={fur} stroke="#392518" strokeWidth="1" />
    <ellipse cx="18" cy="25" rx="9" ry="5" fill={bear ? '#b48a60' : '#b86242'} />
    {bear ? <ellipse cx="18" cy="23" rx="4" ry="2.5" fill="#090d16" /> : <g fill="#090d16"><circle cx="14" cy="25" r="1.4" /><circle cx="22" cy="25" r="1.4" /></g>}
    <path d="M9 13L15 19M15 13L9 19M21 13L27 19M27 13L21 19" fill="none" stroke="#fff3dc" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

export function PracticeKillsHud({ kills }: { kills: RunKills }) {
  return <div className="game-currency-hud practice-kills-hud" role="group" aria-label="Enemies defeated this run">
    <div className="wallet-bar">
      {(['bull', 'bear'] as const).map(enemy => <span key={enemy} data-enemy={enemy} aria-label={`Killed ${enemy}s: ${kills[enemy]}`} title={`Killed ${enemy}s`}>
        <DefeatedHead enemy={enemy} /><b>{kills[enemy].toLocaleString()}</b>
      </span>)}
    </div>
  </div>;
}