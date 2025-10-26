import { AppearanceSettings } from '../types/settings';

export class EmojiStyleInjector {
  private static STYLE_ID = 'nutrition-tracker-emoji-vars';

  static injectEmojiStyles(appearance: AppearanceSettings): void {
    // Remove existing style element if it exists
    const existingStyle = document.getElementById(this.STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const styleEl = document.createElement('style');
    styleEl.id = this.STYLE_ID;
    
    // Inject CSS variables
    styleEl.textContent = `
      :root {
        --ntr-emoji-calories: '${appearance.caloriesEmoji}';
        --ntr-emoji-protein: '${appearance.proteinEmoji}';
        --ntr-emoji-carbs: '${appearance.carbsEmoji}';
        --ntr-emoji-fat: '${appearance.fatEmoji}';
      }
    `;
    
    document.head.appendChild(styleEl);
  }

  static removeEmojiStyles(): void {
    const existingStyle = document.getElementById(this.STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }
  }
}

