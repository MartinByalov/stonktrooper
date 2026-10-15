import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyText } from './copyText';

test('uses modern clipboard when available', async () => {
  let value = '';
  await copyText('score-url', { clipboard: { writeText: async text => { value = text; } } } as Navigator, {} as Document, {} as HTMLElement);
  assert.equal(value, 'score-url');
});

for (const rejected of [false, true]) {
  test(`legacy copy restores focus and removes temporary field (modern rejected: ${rejected})`, async () => {
    let removed = false, focused = false, selected = false;
    const field = { value: '', readOnly: false, style: {}, focus() {}, select() { selected = true; }, setSelectionRange() {}, remove() { removed = true; } };
    const host = { appendChild(node: unknown) { assert.equal(node, field); } } as HTMLElement;
    const doc = { activeElement: { focus() { focused = true; } }, getSelection: () => null, createElement: () => field,
      execCommand(command: string) { assert.equal(command, 'copy'); assert(selected); assert.equal(field.value, 'score-url'); return true; } } as unknown as Document;
    const browser = rejected ? { clipboard: { writeText: async () => { throw new Error('denied'); } } } : {};
    await copyText('score-url', browser as unknown as Navigator, doc, host);
    assert(removed && focused);
    doc.execCommand = () => false;
    await assert.rejects(copyText('score-url', browser as unknown as Navigator, doc, host));
  });
}