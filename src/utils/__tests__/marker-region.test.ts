import { wrapInMarkers, replaceMarkedRegion, NTR_MARKER_BEGIN, NTR_MARKER_END } from '../content-parser';

describe('wrapInMarkers', () => {
  test('wraps content between begin and end markers', () => {
    expect(wrapInMarkers('generated stuff')).toBe('%% ntr:begin %%\ngenerated stuff\n%% ntr:end %%');
  });
});

describe('replaceMarkedRegion', () => {
  test('appends a new marked region when none exists in empty content', () => {
    expect(replaceMarkedRegion('', 'cards go here')).toBe(wrapInMarkers('cards go here'));
  });

  test('appends a new marked region after existing user content when none exists yet', () => {
    const content = '# My Food Log\n\nSome notes I wrote by hand.';
    const result = replaceMarkedRegion(content, 'cards go here');
    expect(result).toBe(`${content}\n\n${wrapInMarkers('cards go here')}`);
  });

  test('replaces only the content between existing markers, preserving text before and after', () => {
    const content = [
      '# My Food Log',
      '',
      'A note I wrote above the generated region.',
      '',
      NTR_MARKER_BEGIN,
      'old generated cards',
      NTR_MARKER_END,
      '',
      'A note I wrote below the generated region.',
    ].join('\n');

    const result = replaceMarkedRegion(content, 'new generated cards');

    expect(result).toBe([
      '# My Food Log',
      '',
      'A note I wrote above the generated region.',
      '',
      NTR_MARKER_BEGIN,
      'new generated cards',
      NTR_MARKER_END,
      '',
      'A note I wrote below the generated region.',
    ].join('\n'));
  });

  test('re-rendering twice in a row is idempotent for unchanged input', () => {
    const initial = replaceMarkedRegion('# Log\n\nUser note.', 'cards v1');
    const rerendered = replaceMarkedRegion(initial, 'cards v1');
    expect(rerendered).toBe(initial);
  });

  test('updating the generated region does not disturb surrounding user content across repeated edits', () => {
    let content = replaceMarkedRegion('# Log\n\nUser note above.\n\nUser note below.', 'cards v1');
    content = replaceMarkedRegion(content, 'cards v2');
    content = replaceMarkedRegion(content, 'cards v3');

    expect(content).toContain('User note above.');
    expect(content).toContain('User note below.');
    expect(content).toContain('cards v3');
    expect(content).not.toContain('cards v1');
    expect(content).not.toContain('cards v2');
  });
});
