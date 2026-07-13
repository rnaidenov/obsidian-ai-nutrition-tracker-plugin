import { TFile, TFolder, Vault } from 'obsidian';
import { readFoodLog, writeFoodLog, getFoodLogFilePath, ensureFoodLogDirectoryExists } from '../food-log-storage';
import { FoodLog } from '../../../types/nutrition';
import { PluginSettings, DEFAULT_SETTINGS } from '../../../types/settings';

function createFakeVault(initialFiles: Record<string, string> = {}) {
  const files = new Map(Object.entries(initialFiles));
  const folders = new Set<string>();

  const vault: Vault = {
    getAbstractFileByPath: jest.fn((path: string) => {
      if (files.has(path)) return new TFile(path);
      if (folders.has(path)) return new TFolder(path);
      return null;
    }),
    read: jest.fn(async (file: TFile) => files.get(file.path) ?? ''),
    modify: jest.fn(async (file: TFile, data: string) => {
      files.set(file.path, data);
    }),
    create: jest.fn(async (path: string, data: string) => {
      files.set(path, data);
      return new TFile(path);
    }),
    createFolder: jest.fn(async (path: string) => {
      folders.add(path);
      return new TFolder(path);
    }),
    process: jest.fn(async (file: TFile, fn: (data: string) => string) => {
      const result = fn(files.get(file.path) ?? '');
      files.set(file.path, result);
      return result;
    }),
  };

  return { vault, files, folders };
}

const settings: PluginSettings = { ...DEFAULT_SETTINGS, logStoragePath: 'tracker/health/food/log' };

describe('getFoodLogFilePath', () => {
  test('nests the dated JSON file under a .data directory', () => {
    expect(getFoodLogFilePath(settings, '2026-07-13')).toBe('tracker/health/food/log/.data/2026-07-13.json');
  });
});

describe('readFoodLog', () => {
  test('returns an empty log when the file does not exist', async () => {
    const { vault } = createFakeVault();
    expect(await readFoodLog(vault, settings, '2026-07-13')).toEqual({ date: '2026-07-13', entries: [] });
  });

  test('returns parsed entries from a valid JSON file', async () => {
    const log: FoodLog = {
      date: '2026-07-13',
      entries: [{ id: 'e1', food: 'Oats', quantity: '50g', calories: 190, protein: 7, carbs: 33, fat: 3 }],
    };
    const { vault } = createFakeVault({ 'tracker/health/food/log/.data/2026-07-13.json': JSON.stringify(log) });
    expect(await readFoodLog(vault, settings, '2026-07-13')).toEqual(log);
  });

  test('returns an empty log for malformed JSON instead of throwing', async () => {
    const { vault } = createFakeVault({ 'tracker/health/food/log/.data/2026-07-13.json': '{ not valid' });
    expect(await readFoodLog(vault, settings, '2026-07-13')).toEqual({ date: '2026-07-13', entries: [] });
  });

  test('returns an empty log when entries is missing or not an array', async () => {
    const { vault } = createFakeVault({ 'tracker/health/food/log/.data/2026-07-13.json': JSON.stringify({ date: '2026-07-13' }) });
    expect(await readFoodLog(vault, settings, '2026-07-13')).toEqual({ date: '2026-07-13', entries: [] });
  });
});

describe('writeFoodLog', () => {
  test('creates the file and its .data directory when none exists yet', async () => {
    const { vault, files, folders } = createFakeVault();
    const log: FoodLog = { date: '2026-07-13', entries: [] };

    await writeFoodLog(vault, settings, log);

    expect(folders.has('tracker/health/food/log/.data')).toBe(true);
    expect(JSON.parse(files.get('tracker/health/food/log/.data/2026-07-13.json')!)).toEqual(log);
    expect(vault.create).toHaveBeenCalledTimes(1);
    expect(vault.modify).not.toHaveBeenCalled();
  });

  test('modifies the existing file in place rather than recreating it', async () => {
    const { vault, files } = createFakeVault({ 'tracker/health/food/log/.data/2026-07-13.json': '{"date":"2026-07-13","entries":[]}' });
    const log: FoodLog = { date: '2026-07-13', entries: [{ id: 'e1', food: 'Egg', quantity: '2', calories: 140, protein: 12, carbs: 1, fat: 10 }] };

    await writeFoodLog(vault, settings, log);

    expect(JSON.parse(files.get('tracker/health/food/log/.data/2026-07-13.json')!)).toEqual(log);
    expect(vault.modify).toHaveBeenCalledTimes(1);
    expect(vault.create).not.toHaveBeenCalled();
  });

  test('write then read round trips the same log', async () => {
    const { vault } = createFakeVault();
    const log: FoodLog = {
      date: '2026-07-13',
      entries: [
        { id: 'e1', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10, timestamp: '2026-07-13T08:00:00.000Z' },
        { id: 'e2', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10, timestamp: '2026-07-13T18:00:00.000Z' },
      ],
    };

    await writeFoodLog(vault, settings, log);
    expect(await readFoodLog(vault, settings, '2026-07-13')).toEqual(log);
  });
});

describe('ensureFoodLogDirectoryExists', () => {
  test('creates the .data folder when it does not exist', async () => {
    const { vault, folders } = createFakeVault();
    await ensureFoodLogDirectoryExists(vault, settings);
    expect(folders.has('tracker/health/food/log/.data')).toBe(true);
    expect(vault.createFolder).toHaveBeenCalledTimes(1);
  });

  test('does nothing when the folder already exists', async () => {
    const { vault, folders } = createFakeVault();
    folders.add('tracker/health/food/log/.data');
    await ensureFoodLogDirectoryExists(vault, settings);
    expect(vault.createFolder).not.toHaveBeenCalled();
  });
});
