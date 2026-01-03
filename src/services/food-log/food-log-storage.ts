import { Vault, normalizePath } from 'obsidian';
import { PluginSettings } from '../../types/settings';
import * as FileUtils from '../file-utils';

export function getFoodLogPath(vault: Vault, settings: PluginSettings): string {
  const todayString = FileUtils.getTodayString();
  return normalizePath(`${settings.logStoragePath}/${todayString}.md`);
}

export async function ensureFoodLogDirectoryExists(
  vault: Vault,
  settings: PluginSettings
): Promise<void> {
  await FileUtils.ensureDirectoryExists({ vault }, settings.logStoragePath);
}
