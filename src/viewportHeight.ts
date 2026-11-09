// Keep the app shell within the visible viewport, including browser chrome changes.
export function observeViewportHeight(
  app: Pick<HTMLElement, 'style'>,
  viewportWindow: Window = window,
  viewportDocument: Document = document,
) {
  const viewport = viewportWindow.visualViewport;
  const native = viewportDocument.documentElement?.dataset.native === 'true';
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  let settling = false;
  const update = () => {
    // Recents/background transitions are not usable game viewport sizes.
    if (viewportDocument.hidden) return;
    if (native && settling) return;
    // Pinch zoom must not reflow the game underneath the user's fingers.
    if (viewport && viewport.scale !== 1) return;
    const height = viewportDocument.fullscreenElement
      ? viewportWindow.innerHeight
      : viewport?.height ?? viewportWindow.innerHeight;
    if (Number.isFinite(height) && height > 0) {
      app.style.setProperty('--app-viewport-height', `${height}px`);
    }
  };
  viewportWindow.addEventListener('resize', update);
  viewportWindow.addEventListener('pageshow', update);
  const restore = () => {
    if (!native) { if (!viewportDocument.hidden) update(); return; }
    // Android restores bars/cutout insets over several frames after unlock.
    // Keep the last usable shell height until those intermediate sizes settle.
    settling = true;
    clearTimeout(restoreTimer);
    if (viewportDocument.hidden) return;
    restoreTimer = setTimeout(() => { settling = false; update(); }, 400);
  };
  viewportWindow.addEventListener('focus', restore);
  viewportDocument.addEventListener('visibilitychange', restore);
  viewport?.addEventListener('resize', update);
  viewportDocument.addEventListener('fullscreenchange', update);
  update();
  return () => {
    viewportWindow.removeEventListener('resize', update);
    viewportWindow.removeEventListener('pageshow', update);
    clearTimeout(restoreTimer);
    viewportWindow.removeEventListener('focus', restore);
    viewportDocument.removeEventListener('visibilitychange', restore);
    viewport?.removeEventListener('resize', update);
    viewportDocument.removeEventListener('fullscreenchange', update);
    app.style.removeProperty('--app-viewport-height');
  };
}