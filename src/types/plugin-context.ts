import { App, Vault } from 'obsidian';
import { PluginSettings } from './settings';

export interface PluginContext {
  vault: Vault;
  app: App;
  settings: PluginSettings;
}
