// Keep legacy copy as a best-effort fallback for unavailable/rejected Clipboard API.
export async function copyText(text: string, browser: Pick<Navigator, 'clipboard'>, doc: Document, host: HTMLElement = doc.body): Promise<void> {
  try {
    if (browser.clipboard?.writeText) {
      await browser.clipboard.writeText(text);
      return;
    }
  } catch {
    // Embedded or non-secure contexts may reject the modern API.
  }
  const previous = doc.activeElement as HTMLElement | null;
  const selection = doc.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
  const field = doc.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none;';
  host.appendChild(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, text.length);
    if (!doc.execCommand('copy')) throw new Error('Clipboard copy was rejected.');
  } finally {
    field.remove();
    previous?.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }
}