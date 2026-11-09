import { useState } from 'react';

// Preferences: disconnect the Google account. Two taps, so it is never done by accident. The explanation sits with the other
// Preferences text and the button goes under "Clear saved preferences".
export function DisconnectGoogleNote() {
  return <p>Disconnect from Google signs you out and removes this game's access to your Google Account. It also deletes our technical records for your save. Your save stays in your own Google Drive, and you can delete it in your Google Account under Third-party apps and services.</p>;
}
export function DisconnectGoogle({ onDisconnect }: { onDisconnect: () => Promise<void> }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy' | 'failed'>('idle');
  const label = step === 'confirm' ? 'Tap again to disconnect' : step === 'busy' ? 'Disconnecting...' : step === 'failed' ? 'Could not disconnect. Try again' : 'Disconnect from Google';
  return <button type="button" disabled={step === 'busy'} className="preferences-clear-button block mx-auto w-full py-2.5 px-3 rounded-lg border font-bold text-xs font-mono-term cursor-pointer"
      onClick={() => {
        if (step !== 'confirm') { setStep('confirm'); return; }
        setStep('busy');
        onDisconnect().catch(() => setStep('failed'));
      }}><span aria-live="polite">{label}</span></button>;
}
