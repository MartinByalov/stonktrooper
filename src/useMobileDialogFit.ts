import { useEffect, type RefObject } from 'react';

// Scale the complete dialog, including its controls, rather than scrolling it.
export function useMobileDialogFit(root: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const app = root.current;
    if (!app) return;
    const media = window.matchMedia('(pointer: coarse)');
    const selector = '.game-result, .fixed.inset-0.z-50 > [role="dialog"]:not(.mobile-how-to-panel)';
    const observed = new Set<Element>();
    let frame = 0;
    const fit = () => {
      frame = 0;
      const dialogs = app.querySelectorAll<HTMLElement>(selector);
      const targets = new Set<Element>();
      dialogs.forEach(dialog => {
        const parent = dialog.parentElement;
        if (!parent) return;
        targets.add(dialog);
        targets.add(parent);
        if (!media.matches) {
          dialog.style.removeProperty('--mobile-dialog-scale');
          return;
        }
        const style = getComputedStyle(parent);
        const width = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const height = parent.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        const scale = Math.max(0, Math.min(1, width / Math.max(1, dialog.offsetWidth), height / Math.max(1, dialog.offsetHeight)));
        dialog.style.setProperty('--mobile-dialog-scale', String(scale));
      });
      observed.forEach(element => {
        if (!targets.has(element)) { resize.unobserve(element); observed.delete(element); }
      });
      targets.forEach(element => {
        if (!observed.has(element)) { resize.observe(element); observed.add(element); }
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
    const resize = new ResizeObserver(schedule);
    const mutations = new MutationObserver(schedule);
    mutations.observe(app, { childList: true, subtree: true, characterData: true });
    media.addEventListener('change', schedule);
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      media.removeEventListener('change', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [root]);
}