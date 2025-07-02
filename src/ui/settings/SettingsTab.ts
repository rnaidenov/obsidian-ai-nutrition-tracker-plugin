import { App, PluginSettingTab, Setting } from 'obsidian';
import NutritionTrackerPlugin from '../../../main';

export class SettingsTab extends PluginSettingTab {
  plugin: NutritionTrackerPlugin;

  constructor(app: App, plugin: NutritionTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'Nutrition Tracker Settings' });

    // API Configuration Section
    containerEl.createEl('h3', { text: 'AI Configuration' });

    new Setting(containerEl)
      .setName('OpenRouter API Key')
      .setDesc('Your OpenRouter API key for LLM processing. Get one at openrouter.ai')
      .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.openRouterApiKey)
        .onChange(async (value) => {
          this.plugin.settings.openRouterApiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('LLM Model')
      .setDesc('The AI model to use for food analysis')
      .addDropdown(dropdown => dropdown
        .addOption('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet (Recommended)')
        .addOption('openai/gpt-4o', 'GPT-4O')
        .addOption('openai/gpt-4o-mini', 'GPT-4O Mini (Cheaper)')
        .setValue(this.plugin.settings.llmModel)
        .onChange(async (value) => {
          this.plugin.settings.llmModel = value;
          await this.plugin.saveSettings();
        }));

    // Nutrition Goals Section
    containerEl.createEl('h3', { text: 'Daily Nutrition Goals' });
    
    new Setting(containerEl)
      .setName('Daily Calories')
      .setDesc('Your daily calorie target')
      .addText(text => text
        .setPlaceholder('2000')
        .setValue(this.plugin.settings.nutritionGoals.calories.toString())
        .onChange(async (value) => {
          const calories = parseInt(value) || 2000;
          this.plugin.settings.nutritionGoals.calories = calories;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Daily Protein (g)')
      .setDesc('Your daily protein target in grams')
      .addText(text => text
        .setPlaceholder('150')
        .setValue(this.plugin.settings.nutritionGoals.protein.toString())
        .onChange(async (value) => {
          const protein = parseInt(value) || 150;
          this.plugin.settings.nutritionGoals.protein = protein;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Daily Carbs (g)')
      .setDesc('Your daily carbohydrates target in grams')
      .addText(text => text
        .setPlaceholder('100')
        .setValue(this.plugin.settings.nutritionGoals.carbs.toString())
        .onChange(async (value) => {
          const carbs = parseInt(value) || 100;
          this.plugin.settings.nutritionGoals.carbs = carbs;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Daily Fat (g)')
      .setDesc('Your daily fat target in grams')
      .addText(text => text
        .setPlaceholder('80')
        .setValue(this.plugin.settings.nutritionGoals.fat.toString())
        .onChange(async (value) => {
          const fat = parseInt(value) || 80;
          this.plugin.settings.nutritionGoals.fat = fat;
          await this.plugin.saveSettings();
        }));

    // Storage Settings Section
    containerEl.createEl('h3', { text: 'Storage Configuration' });
    
    new Setting(containerEl)
      .setName('Food Log Storage Path')
      .setDesc('Folder path where daily food logs will be stored')
      .addText(text => text
        .setPlaceholder('tracker/health/food/log')
        .setValue(this.plugin.settings.logStoragePath)
        .onChange(async (value) => {
          this.plugin.settings.logStoragePath = value || 'tracker/health/food/log';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Image Storage Path')
      .setDesc('Folder path where food images will be stored')
      .addText(text => text
        .setPlaceholder('tracker/health/food/log/images')
        .setValue(this.plugin.settings.imageStoragePath)
        .onChange(async (value) => {
          this.plugin.settings.imageStoragePath = value || 'tracker/health/food/log/images';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Template Path')
      .setDesc('Path to your food log template file')
      .addText(text => text
        .setPlaceholder('templates/Food Log Template.md')
        .setValue(this.plugin.settings.templatePath)
        .onChange(async (value) => {
          this.plugin.settings.templatePath = value || 'templates/Food Log Template.md';
          await this.plugin.saveSettings();
        }));

    // Other Settings Section
    containerEl.createEl('h3', { text: 'Other Settings' });

    new Setting(containerEl)
      .setName('Auto-create daily notes')
      .setDesc('Automatically create daily food log notes if they don\'t exist')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoCreateDailyNotes)
        .onChange(async (value) => {
          this.plugin.settings.autoCreateDailyNotes = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Date Format')
      .setDesc('Date format for daily logs (YYYY-MM-DD, DD-MM-YYYY, etc.)')
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD')
        .setValue(this.plugin.settings.dateFormat)
        .onChange(async (value) => {
          this.plugin.settings.dateFormat = value || 'YYYY-MM-DD';
          await this.plugin.saveSettings();
        }));
  }
} 