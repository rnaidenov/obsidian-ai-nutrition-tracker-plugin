import { createOrUpdateFoodLog, deleteFoodLogItem } from '../manager';
import { readFoodLog } from '../food-log-storage';
import { PluginContext } from '../../../types/plugin-context';
import { PluginSettings, DEFAULT_SETTINGS } from '../../../types/settings';
import { createFakeVault } from '../../../test-utils/fake-vault';
import { FoodItem, FoodLog } from '../../../types/nutrition';

const settings: PluginSettings = { ...DEFAULT_SETTINGS, logStoragePath: 'tracker/health/food/log' };
const TODAY = new Date().toISOString().slice(0, 10);
const notePath = `tracker/health/food/log/${TODAY}.md`;
const logJsonPath = `tracker/health/food/log/.data/${TODAY}.json`;

function makeCtx(vault: ReturnType<typeof createFakeVault>['vault']): PluginContext {
  return { vault, settings, app: {} as PluginContext['app'] };
}

describe('createOrUpdateFoodLog — new entries', () => {
  test('creates a new note wrapped in markers and a JSON entry with a fresh id', async () => {
    const { vault, files } = createFakeVault();
    const item: FoodItem = { food: 'Oats', quantity: '50g', calories: 190, protein: 7, carbs: 33, fat: 3 };

    const result = await createOrUpdateFoodLog(makeCtx(vault), [item]);

    expect(result.createdNewFile).toBe(true);
    expect(result.filePath).toBe(notePath);

    const log: FoodLog = JSON.parse(files.get(logJsonPath)!);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ food: 'Oats', quantity: '50g' });
    expect(typeof log.entries[0].id).toBe('string');

    const noteContent = files.get(notePath)!;
    expect(noteContent).toContain('%% ntr:begin %%');
    expect(noteContent).toContain('%% ntr:end %%');
    expect(noteContent).toContain(`data-ntr-id="${log.entries[0].id}"`);
  });

  test('appending to an existing log preserves earlier entries and user text around the markers', async () => {
    const { vault, files } = createFakeVault();
    await createOrUpdateFoodLog(makeCtx(vault), [{ food: 'Oats', quantity: '50g', calories: 190, protein: 7, carbs: 33, fat: 3 }]);

    // Simulate a user hand-editing text outside the marked region.
    const before = files.get(notePath)!;
    files.set(notePath, before.replace('%% ntr:end %%', '%% ntr:end %%\n\nMy personal note about today.'));

    await createOrUpdateFoodLog(makeCtx(vault), [{ food: 'Banana', quantity: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 }]);

    const log: FoodLog = JSON.parse(files.get(logJsonPath)!);
    expect(log.entries.map(e => e.food)).toEqual(['Oats', 'Banana']);

    const noteContent = files.get(notePath)!;
    expect(noteContent).toContain('My personal note about today.');
    expect(noteContent).toContain('Oats');
    expect(noteContent).toContain('Banana');
  });
});

describe('createOrUpdateFoodLog — editing an existing entry by id', () => {
  test('replaces only the targeted entry, leaving others (including duplicates) untouched', async () => {
    const { vault, files } = createFakeVault();
    await createOrUpdateFoodLog(makeCtx(vault), [
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
    ]);

    const logBefore: FoodLog = JSON.parse(files.get(logJsonPath)!);
    const targetId = logBefore.entries[1].id;

    await createOrUpdateFoodLog(
      makeCtx(vault),
      [{ food: 'Scrambled egg', quantity: '3 pcs', calories: 210, protein: 18, carbs: 1, fat: 15 }],
      targetId
    );

    const logAfter = await readFoodLog(vault, settings, TODAY);
    expect(logAfter.entries).toHaveLength(2);
    expect(logAfter.entries[0]).toMatchObject({ food: 'Egg', id: logBefore.entries[0].id });
    expect(logAfter.entries[1]).toMatchObject({ food: 'Scrambled egg', id: targetId });
  });
});

describe('deleteFoodLogItem — duplicate identical entries', () => {
  test('deleting by id removes exactly the targeted entry among identical duplicates', async () => {
    const { vault, files } = createFakeVault();
    await createOrUpdateFoodLog(makeCtx(vault), [
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10, timestamp: '2026-07-13T08:00:00.000Z' },
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10, timestamp: '2026-07-13T18:00:00.000Z' },
    ]);

    const logBefore: FoodLog = JSON.parse(files.get(logJsonPath)!);
    const secondEntryId = logBefore.entries[1].id;

    await deleteFoodLogItem(makeCtx(vault), secondEntryId);

    const logAfter: FoodLog = JSON.parse(files.get(logJsonPath)!);
    expect(logAfter.entries).toHaveLength(1);
    expect(logAfter.entries[0].id).toBe(logBefore.entries[0].id);
    expect(logAfter.entries[0].timestamp).toBe('2026-07-13T08:00:00.000Z');

    const noteContent = files.get(notePath)!;
    expect(noteContent).not.toContain(secondEntryId);
  });

  test('throws when the entry id is not found', async () => {
    const { vault } = createFakeVault();
    await createOrUpdateFoodLog(makeCtx(vault), [{ food: 'Oats', quantity: '50g', calories: 190, protein: 7, carbs: 33, fat: 3 }]);

    await expect(deleteFoodLogItem(makeCtx(vault), 'does-not-exist')).rejects.toThrow();
  });
});
