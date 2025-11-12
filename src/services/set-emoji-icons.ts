import { AppearanceSettings } from '../types/settings';

export function setEmojiIcons(appearance: AppearanceSettings): void {
  document.documentElement.style.setProperty('--ntr-emoji-calories', `'${appearance.caloriesEmoji}'`);
  document.documentElement.style.setProperty('--ntr-emoji-protein', `'${appearance.proteinEmoji}'`);
  document.documentElement.style.setProperty('--ntr-emoji-carbs', `'${appearance.carbsEmoji}'`);
  document.documentElement.style.setProperty('--ntr-emoji-fat', `'${appearance.fatEmoji}'`);
}

