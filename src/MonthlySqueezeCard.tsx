import { AchievementArtwork } from './AchievementArtwork';
import { CosmeticPreview } from './CosmeticPreview';
import { MOBILE_ACHIEVEMENTS, SKINS } from './progression';
import { FIRST_MONTHLY_SQUEEZE } from '../shared/monthlySqueezeSchedule';

// One Achievement row headed by Monthly Squeeze, shared by the Home card and the Achievements list.
export interface MonthlySqueezeCardProps {
  theme: 'light' | 'dark';
  // Group progress; unknown until the first answer from the server.
  participants?: number;
  target: number;
  // This player's own liquidations this month; absent for a Guest, whose effort is not counted.
  personal?: number;
  threshold: number;
  unlocked: boolean;
  claimed: boolean;
  busy?: boolean;
  onClaim?: () => void;
  // A short line under the card (for example the sign-in request).
  notice?: string;
  onNotice?: () => void;
  noticeAction?: string;
}

export function MonthlySqueezeCard(props: MonthlySqueezeCardProps) {
  const { theme, participants, target, personal, threshold, unlocked, claimed, busy, onClaim, notice, onNotice, noticeAction } = props;
  const achievement = MOBILE_ACHIEVEMENTS.find(item => item.id === 'paper-hands');
  const reward = SKINS.find(skin => skin.id === FIRST_MONTHLY_SQUEEZE.reward.itemId);
  if (!achievement || !reward) return null;
  const group = claimed || unlocked ? 100 : participants === undefined ? 0 : Math.min(100, participants / target * 100);
  const mine = personal === undefined ? undefined : Math.min(threshold, personal);
  return <section className="achievements-grid monthly-squeeze-card" aria-label="Monthly Squeeze">
    <article data-achievement={achievement.id} data-complete={unlocked || claimed} data-rewarded={claimed} data-monthly="true"
      style={{ backgroundSize: `${group}% 100%` }}>
      <div className="achievement-image"><AchievementArtwork art={achievement.art} id={achievement.id} theme={theme} /></div>
      <div className="achievement-details">
        <span className="monthly-squeeze-label">Monthly Squeeze</span>
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
        {!claimed && mine !== undefined && <div className="achievement-requirements monthly-squeeze-yours" aria-label="Your liquidations this month">
          <span role="progressbar" aria-label="Your liquidations" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={mine}>You {mine}/{threshold}</span>
        </div>}
        <div className="achievement-reward" aria-label="Reward">
          <span>Reward</span>
          <span className="achievement-cosmetic-reward" title={reward.name}>
            Mount:
            <span className="achievement-reward-icon" role="img" aria-label={reward.name}><CosmeticPreview skin={reward} theme={theme} animationsEnabled={false} centerArtwork /></span>
          </span>
        </div>
      </div>
      {!claimed && !unlocked && <strong className="achievement-count" role="progressbar" aria-label="Everyone's progress" aria-valuemin={0} aria-valuemax={target}
        aria-valuenow={participants ?? 0}>{participants === undefined ? '–' : participants.toLocaleString()}/{target.toLocaleString()}</strong>}
      <div className="achievement-actions">
        {claimed && <span className="achievement-done-stamp" aria-label="Monthly Squeeze collected">Done</span>}
        {!claimed && unlocked && <button type="button" className="achievement-collect" aria-label={`Claim ${achievement.name} reward`} aria-busy={busy || undefined} disabled={!onClaim || busy} onClick={onClaim}>Claim</button>}
      </div>
    </article>
    {notice && <p className="monthly-squeeze-notice" role="status">{notice}{onNotice && noticeAction && <> <button type="button" className="monthly-squeeze-notice-action" onClick={onNotice}>{noticeAction}</button></>}</p>}
  </section>;
}
