import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import NutritionTrackerPlugin from '../../../main';
import { FolderSuggest } from './FolderSuggest';

export class SettingsTab extends PluginSettingTab {
  plugin: NutritionTrackerPlugin;

  constructor(app: App, plugin: NutritionTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    // AI Section
    new Setting(containerEl)
      .setName('AI')
      .setHeading();

    new Setting(containerEl)
      .setName('OpenRouter API key')
      .setDesc('Your OpenRouter API key for LLM processing. Get one at openrouter.ai')
      .addText(text => {
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.openRouterApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openRouterApiKey = value;
            await this.plugin.saveSettings();
          });
        
        // Start as password field
        text.inputEl.type = 'password';
        
        // Show value when focused
        text.inputEl.addEventListener('focus', () => {
          text.inputEl.type = 'text';
        });
        
        // Hide value when unfocused
        text.inputEl.addEventListener('blur', () => {
          text.inputEl.type = 'password';
        });
      });

    new Setting(containerEl)
      .setName('LLM model')
      .setDesc('The AI model to use for food analysis')
      .addDropdown(dropdown => dropdown
        .addOption('google/gemini-2.5-flash', 'Gemini 2.5 Flash (Fast & Smart - Recommended)')
        .addOption('google/gemini-2.5-pro', 'Gemini 2.5 Pro (Most Capable)')
        .addOption('anthropic/claude-4.0-sonnet', 'Claude 4 Sonnet')
        .addOption('anthropic/claude-3.7-sonnet', 'Claude 3.7 Sonnet')
        .addOption('openai/gpt-4o', 'GPT-4O')
        .setValue(this.plugin.settings.llmModel)
        .onChange(async (value) => {
          this.plugin.settings.llmModel = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Use custom model')
      .setDesc('Enable this to use a custom model instead of the predefined options')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useCustomModel)
        .onChange(async (value) => {
          this.plugin.settings.useCustomModel = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh the display to show/hide custom model input
        }));

    // Only show custom model input when custom model is enabled
    if (this.plugin.settings.useCustomModel) {
      new Setting(containerEl)
        .setName('Custom model name')
        .setDesc('Enter the model name/identifier (e.g., "anthropic/claude-3.5-sonnet", "openai/gpt-4o", "meta-llama/llama-3.1-405b")')
        .addText(text => text
          .setPlaceholder('Enter model name...')
          .setValue(this.plugin.settings.customModelName)
          .onChange(async (value) => {
            this.plugin.settings.customModelName = value;
            await this.plugin.saveSettings();
          }));
    }

    // Nutrition Goals Section
    new Setting(containerEl)
      .setName('Daily nutrition goals')
      .setHeading();
    
    new Setting(containerEl)
      .setName('Daily calories')
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
      .setName('Daily protein (g)')
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
      .setName('Daily carbs (g)')
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
      .setName('Daily fat (g)')
      .setDesc('Your daily fat target in grams')
      .addText(text => text
        .setPlaceholder('80')
        .setValue(this.plugin.settings.nutritionGoals.fat.toString())
        .onChange(async (value) => {
          const fat = parseInt(value) || 80;
          this.plugin.settings.nutritionGoals.fat = fat;
          await this.plugin.saveSettings();
        }));

    // Storage Section
    new Setting(containerEl)
      .setName('Storage')
      .setHeading();
    
    new Setting(containerEl)
      .setName('Food log storage path')
      .setDesc('Folder path where daily food logs will be stored')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('tracker/health/food/log')
          .setValue(this.plugin.settings.logStoragePath)
          .onChange(async (value) => {
            this.plugin.settings.logStoragePath = normalizePath(value || 'tracker/health/food/log');
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Meal storage path')
      .setDesc('Folder path where saved meals will be stored')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('tracker/health/food/meals')
          .setValue(this.plugin.settings.mealStoragePath)
          .onChange(async (value) => {
            this.plugin.settings.mealStoragePath = normalizePath(value || 'tracker/health/food/meals');
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Image storage path')
      .setDesc('Folder path where food images will be stored')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('tracker/health/food/log/images')
          .setValue(this.plugin.settings.imageStoragePath)
          .onChange(async (value) => {
            this.plugin.settings.imageStoragePath = normalizePath(value || 'tracker/health/food/log/images');
            await this.plugin.saveSettings();
          });
      });



    // Display Settings Section
    new Setting(containerEl)
      .setName('Display')
      .setHeading();

    new Setting(containerEl)
      .setName('Display theme')
      .setDesc('Theme for generated food logs')
      .addDropdown(dropdown => {
        dropdown
          .addOption('auto', 'Auto (match Obsidian)')
          .addOption('light', 'Light theme')
          .addOption('dark', 'Dark theme')
          .setValue(this.plugin.settings.displayTheme)
          .onChange(async (value: 'auto' | 'light' | 'dark') => {
            this.plugin.settings.displayTheme = value;
            await this.plugin.saveSettings();
          });
      });
  }
} 