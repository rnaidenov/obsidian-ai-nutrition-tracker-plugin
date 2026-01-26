import { App, PluginSettingTab, Setting, normalizePath, Notice } from 'obsidian';
import NutritionTrackerPlugin from '../../../main';
import { FolderSuggest } from './FolderSuggest';
import * as TemplateManager from '../../utils/template/manager';

export class SettingsTab extends PluginSettingTab {
  plugin: NutritionTrackerPlugin;

  constructor(app: App, plugin: NutritionTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private createEmojiPicker(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    currentValue: string,
    defaultEmoji: string,
    emojis: string[],
    onChange: (value: string) => Promise<void>
  ): void {
    const setting = new Setting(containerEl)
      .setName(name)
      .setDesc(desc);

    setting.addText(text => {
      text
        .setPlaceholder(defaultEmoji)
        .setValue(currentValue)
        .onChange(async (value) => {
          await onChange(value || defaultEmoji);
        });
      
      text.inputEl.addClass('emoji-picker-text-input');
    });

    // Add emoji picker buttons
    const pickerContainer = setting.controlEl.createDiv({ cls: 'emoji-picker-container' });

    emojis.forEach(emoji => {
      const button = pickerContainer.createEl('button', {
        text: emoji,
        cls: 'emoji-picker-button'
      });

      button.addEventListener('click', (e) => {
        e.preventDefault();
        const textInput = setting.controlEl.querySelector('input');
        if (textInput) {
          textInput.value = emoji;
          void onChange(emoji);
        }
      });
    });
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();
    
    // AI Section
    new Setting(containerEl)
      .setName('AI')
      .setHeading();

    new Setting(containerEl)
      .setName('Openrouter API key')
      .setDesc('Your openrouter API key for llm processing. Get one at openrouter.ai')
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
      .setName('Llm model')
      .setDesc('The AI model to use for food analysis')
      .addDropdown(dropdown => dropdown
        .addOption('google/gemini-2.5-flash', 'Gemini 2.5 flash (fast & smart - recommended)')
        .addOption('google/gemini-2.5-pro', 'Gemini 2.5 pro (most capable)')
        .addOption('anthropic/claude-4.0-sonnet', 'Claude 4 sonnet')
        .addOption('anthropic/claude-3.7-sonnet', 'Claude 3.7 sonnet')
        .addOption('openai/gpt-4o', 'Gpt-4o')
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
      .setName('Nutrition goals')
      .setHeading();
    
    new Setting(containerEl)
      .setName('Target daily calories')
      .addText(text => text
        .setPlaceholder('2000')
        .setValue(this.plugin.settings.nutritionGoals.calories.toString())
        .onChange(async (value) => {
          const calories = parseInt(value) || 2000;
          this.plugin.settings.nutritionGoals.calories = calories;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Target daily protein (g)')
      .addText(text => text
        .setPlaceholder('150')
        .setValue(this.plugin.settings.nutritionGoals.protein.toString())
        .onChange(async (value) => {
          const protein = parseInt(value) || 150;
          this.plugin.settings.nutritionGoals.protein = protein;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Target daily carbs (g)')
      .addText(text => text
        .setPlaceholder('100')
        .setValue(this.plugin.settings.nutritionGoals.carbs.toString())
        .onChange(async (value) => {
          const carbs = parseInt(value) || 100;
          this.plugin.settings.nutritionGoals.carbs = carbs;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Target daily fat (g)')
      .addText(text => text
        .setPlaceholder('80')
        .setValue(this.plugin.settings.nutritionGoals.fat.toString())
        .onChange(async (value) => {
          const fat = parseInt(value) || 80;
          this.plugin.settings.nutritionGoals.fat = fat;
          await this.plugin.saveSettings();
        }));

    // Appearance Section
    new Setting(containerEl)
      .setName('Appearance')
      .setHeading();

    // Calories emoji picker
    this.createEmojiPicker(
      containerEl,
      'Calories icon',
      'Choose icon for calories',
      this.plugin.settings.appearance.caloriesEmoji,
      '🔥',
      ['🔥', '⚡', '💥', '🌟', '☀️', '🔆', '💫', '✨', '🎯', '📊'],
      async (value) => {
        this.plugin.settings.appearance.caloriesEmoji = value;
        await this.plugin.saveSettings();
      }
    );

    // Protein emoji picker
    this.createEmojiPicker(
      containerEl,
      'Protein icon',
      'Choose icon for protein',
      this.plugin.settings.appearance.proteinEmoji,
      '💪',
      ['💪', '🥩', '🍗', '🥚', '🐟', '🦐', '🧀', '🥛', '🫘', '🌰'],
      async (value) => {
        this.plugin.settings.appearance.proteinEmoji = value;
        await this.plugin.saveSettings();
      }
    );

    // Carbs emoji picker
    this.createEmojiPicker(
      containerEl,
      'Carbs icon',
      'Choose icon for carbohydrates',
      this.plugin.settings.appearance.carbsEmoji,
      '🌾',
      ['🌾', '🍞', '🍚', '🍝', '🥐', '🥖', '🥨', '🍠', '🥔', '🌽'],
      async (value) => {
        this.plugin.settings.appearance.carbsEmoji = value;
        await this.plugin.saveSettings();
      }
    );

    // Fat emoji picker
    this.createEmojiPicker(
      containerEl,
      'Fat icon',
      'Choose icon for fat',
      this.plugin.settings.appearance.fatEmoji,
      '🥑',
      ['🥑', '🧈', '🫒', '🥜', '🌰', '🥥', '🧀', '🍳', '🥓', '🐟'],
      async (value) => {
        this.plugin.settings.appearance.fatEmoji = value;
        await this.plugin.saveSettings();
      }
    );

    // Storage Section
    new Setting(containerEl)
      .setName('Storage')
      .setHeading();
    
    new Setting(containerEl)
      .setName('Food log folder')
      .setDesc('Location for daily logs')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('Tracker/health/food/log')
          .setValue(this.plugin.settings.logStoragePath)
          .onChange(async (value) => {
            this.plugin.settings.logStoragePath = normalizePath(value || 'tracker/health/food/log');
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Meal folder')
      .setDesc('Location for saved meals')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('Tracker/health/food/meals')
          .setValue(this.plugin.settings.mealStoragePath)
          .onChange(async (value) => {
            this.plugin.settings.mealStoragePath = normalizePath(value || 'tracker/health/food/meals');
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Image folder')
      .setDesc('Location for food images')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('Tracker/health/food/log/images')
          .setValue(this.plugin.settings.imageStoragePath)
          .onChange(async (value) => {
            this.plugin.settings.imageStoragePath = normalizePath(value || 'tracker/health/food/log/images');
            await this.plugin.saveSettings();
          });
      });

    // Templates Section
    new Setting(containerEl).setName('Templates').setHeading();

    new Setting(containerEl)
      .setName('Use custom templates')
      .setDesc('Enable custom template system for food logs. When disabled, uses classic HTML layout.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useCustomTemplates)
        .onChange(async (value) => {
          this.plugin.settings.useCustomTemplates = value;
          await this.plugin.saveSettings();
          await this.display();
        }));

    if (this.plugin.settings.useCustomTemplates) {
      new Setting(containerEl)
        .setName('Templates folder')
        .setDesc('Location for template files')
        .addText(text => {
          new FolderSuggest(this.app, text.inputEl);
          text
            .setPlaceholder('tracker/health/food/templates')
            .setValue(this.plugin.settings.templatesPath)
            .onChange(async (value) => {
              this.plugin.settings.templatesPath = normalizePath(
                value || 'tracker/health/food/templates'
              );
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('Setup templates')
        .setDesc('Create default template files in the templates folder')
        .addButton(button => button
          .setButtonText('Create default templates')
          .onClick(async () => {
            try {
              await TemplateManager.createDefaultTemplates(this.plugin.ctx);
              new Notice('✅ Default templates created successfully');
              await this.display();
            } catch (error) {
              new Notice(`❌ Error creating templates: ${error.message}`);
            }
          }));

      const templateNames = await TemplateManager.listTemplates(this.plugin.ctx);

      const templateSetting = new Setting(containerEl)
        .setName('Default template')
        .setDesc('Template to use for new food logs');

      if (templateNames.length > 0) {
        templateSetting.addDropdown(dropdown => {
          templateNames.forEach(name => {
            dropdown.addOption(name, name);
          });

          dropdown
            .setValue(this.plugin.settings.defaultTemplate)
            .onChange(async (value) => {
              this.plugin.settings.defaultTemplate = value;
              await this.plugin.saveSettings();
            });
        });
      } else {
        templateSetting.setDesc('No templates found. Use "Setup templates" button.');
      }

      new Setting(containerEl)
        .setName('Enable YAML frontmatter')
        .setDesc('Add nutrition data to YAML frontmatter for Dataview queries')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.enableYAMLFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.enableYAMLFrontmatter = value;
            await this.plugin.saveSettings();
          }));
    }

    // Meal Categories Section
    new Setting(containerEl).setName('Meal Categories').setHeading();

    new Setting(containerEl)
      .setName('Show meal categories')
      .setDesc('Display meal category selector in food input modal')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showMealCategories)
        .onChange(async (value) => {
          this.plugin.settings.showMealCategories = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Group by category')
      .setDesc('Organize food logs by meal categories (breakfast, lunch, etc.)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.groupByCategory)
        .onChange(async (value) => {
          this.plugin.settings.groupByCategory = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show timestamps')
      .setDesc('Display time of day for each food entry')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTimestamps)
        .onChange(async (value) => {
          this.plugin.settings.showTimestamps = value;
          await this.plugin.saveSettings();
        }));
  }
} 