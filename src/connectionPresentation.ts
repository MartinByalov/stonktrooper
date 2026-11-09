export function connectionMessage(online: boolean, busy: boolean, ready: boolean, practice: boolean): string {
  if (busy) return 'CONNECTING';
  if (!online) return 'OFFLINE: PROGRESS IS NOT SAVED';
  if (practice) return 'Connection restored • Start a new game to save progress';
  return '';
}