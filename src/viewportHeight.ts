// Keep the app shell within the visible viewport, including browser chrome changes.
export function observeViewportHeight(
  app: Pick<HTMLElement, 'style'>,
  viewportWindow: Window = window,
  viewportDocument: Document = document,
) {
  const viewport = viewportWindow.visualViewport;
  const update = () => {
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
  viewport?.addEventListener('resize', update);
  viewportDocument.addEventListener('fullscreenchange', update);
  update();
  return () => {
    viewportWindow.removeEventListener('resize', update);
    viewportWindow.removeEventListener('pageshow', update);
    viewport?.removeEventListener('resize', update);
    viewportDocument.removeEventListener('fullscreenchange', update);
    app.style.removeProperty('--app-viewport-height');
  };
}