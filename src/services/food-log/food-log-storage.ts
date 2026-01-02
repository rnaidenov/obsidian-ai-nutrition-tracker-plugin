import { Vault, normalizePath } from 'obsidian';
import { PluginSettings } from '../../types/settings';
import { FileUtils } from '../file-utils';

export function getFoodLogPath(vault: Vault, settings: PluginSettings): string {
  const fileUtils = new FileUtils(vault);
  const todayString = fileUtils.getTodayString();
  return normalizePath(`${settings.logStoragePath}/${todayString}.md`);
}

export async function ensureFoodLogDirectoryExists(
  vault: Vault,
  settings: PluginSettings
): Promise<void> {
  const fileUtils = new FileUtils(vault);
  await fileUtils.ensureDirectoryExists(settings.logStoragePath);
}
