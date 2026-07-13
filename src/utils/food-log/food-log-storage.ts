import { Vault, TFile, normalizePath } from 'obsidian';
import { FoodLog } from '../../types/nutrition';
import { PluginSettings } from '../../types/settings';

export function getFoodLogFilePath(settings: PluginSettings, date: string): string {
  return normalizePath(`${settings.logStoragePath}/.data/${date}.json`);
}

export async function ensureFoodLogDirectoryExists(vault: Vault, settings: PluginSettings): Promise<void> {
  const path = normalizePath(`${settings.logStoragePath}/.data`);
  const exists = vault.getAbstractFileByPath(path);
  if (!exists) {
    await vault.createFolder(path);
  }
}

export async function readFoodLog(vault: Vault, settings: PluginSettings, date: string): Promise<FoodLog> {
  try {
    const logPath = getFoodLogFilePath(settings, date);
    const logFile = vault.getAbstractFileByPath(logPath);

    if (!logFile || !(logFile instanceof TFile)) {
      return { date, entries: [] };
    }

    const content = await vault.read(logFile);
    const log = JSON.parse(content);

    if (!log || !Array.isArray(log.entries)) {
      return { date, entries: [] };
    }

    return { date, entries: log.entries };
  } catch (error) {
    console.error('Error reading food log:', error);
    return { date, entries: [] };
  }
}

export async function writeFoodLog(vault: Vault, settings: PluginSettings, log: FoodLog): Promise<void> {
  const logPath = getFoodLogFilePath(settings, log.date);
  const content = JSON.stringify(log, null, 2);
  const existingFile = vault.getAbstractFileByPath(logPath);

  if (existingFile instanceof TFile) {
    await vault.modify(existingFile, content);
  } else {
    await ensureFoodLogDirectoryExists(vault, settings);
    await vault.create(logPath, content);
  }
}
