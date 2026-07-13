import { TFile, TFolder, Notice, normalizePath, Vault } from 'obsidian';

describe('obsidian mock', () => {
  test('TFile derives name, basename and extension from its path', () => {
    const file = new TFile('logs/2026-07-12.md');
    expect(file.path).toBe('logs/2026-07-12.md');
    expect(file.name).toBe('2026-07-12.md');
    expect(file.basename).toBe('2026-07-12');
    expect(file.extension).toBe('md');
  });

  test('TFolder derives name from its path', () => {
    const folder = new TFolder('logs/archive');
    expect(folder.path).toBe('logs/archive');
    expect(folder.name).toBe('archive');
  });

  test('normalizePath is a passthrough', () => {
    expect(normalizePath('logs/2026-07-12.md')).toBe('logs/2026-07-12.md');
  });

  test('Notice is constructible', () => {
    expect(() => new Notice('hello')).not.toThrow();
  });

  test('Vault stub methods resolve without a real vault', async () => {
    const vault = new Vault();
    expect(vault.getAbstractFileByPath('missing.md')).toBeNull();
    const created = await vault.create('new.md', 'content');
    expect(created).toBeInstanceOf(TFile);
    expect(created.path).toBe('new.md');
  });
});
