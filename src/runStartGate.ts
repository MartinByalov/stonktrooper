// One asynchronous start attempt at a time, including native Android taps.
export function createRunStartGate() {
  let pending = false;
  return async (start: () => Promise<void>) => {
    if (pending) return;
    pending = true;
    try { await start(); }
    finally { pending = false; }
  };
}