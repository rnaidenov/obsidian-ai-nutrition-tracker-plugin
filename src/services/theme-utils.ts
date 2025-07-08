import { PluginSettings } from '../types/settings';

export class ThemeUtils {
  constructor(private settings: PluginSettings) {}

  getEffectiveTheme(): 'light' | 'dark' {
    if (this.settings.displayTheme === 'auto') {
      // Auto-detect Obsidian's theme
      return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    }
    return this.settings.displayTheme as 'light' | 'dark';
  }


  getProgressGradient(percentage: number, isDark: boolean): { gradient: string, textColor: string, borderColor: string } {
    // Smooth, muted color transitions: Red (0%) → Orange (50%) → Green (100%)
    // Cap at 100% to prevent color changes beyond completion
    const cappedPercentage = Math.min(percentage, 100);
    let r, g, b;
    
    if (isDark) {
      // Dark theme: Natural, muted colors with good visibility
      if (cappedPercentage <= 50) {
        // Red to Yellow transition (0% to 50%) - natural warm tones
        const factor = cappedPercentage / 50;
        r = Math.round(200 + (220 - 200) * factor); // 200 (natural red) to 220 (natural yellow)
        g = Math.round(90 + (180 - 90) * factor);   // 90 (natural red) to 180 (natural yellow)
        b = Math.round(90 + (85 - 90) * factor);    // 90 (natural red) to 85 (natural yellow)
      } else {
        // Yellow to Green transition (50% to 100%) - natural warm to cool
        const factor = (cappedPercentage - 50) / 50;
        r = Math.round(220 - (220 - 110) * factor); // 220 (natural yellow) to 110 (natural green)
        g = Math.round(180 - (180 - 170) * factor); // 180 (natural yellow) to 170 (natural green)
        b = Math.round(85 + (110 - 85) * factor);   // 85 (natural yellow) to 110 (natural green)
      }
    } else {
      // Light theme: Natural, muted colors - traffic light progression
      if (cappedPercentage <= 50) {
        // Red to Yellow transition (0% to 50%) - natural coral to warm yellow
        const factor = cappedPercentage / 50;
        r = Math.round(190 + (210 - 190) * factor); // 190 (natural coral) to 210 (natural yellow)
        g = Math.round(110 + (175 - 110) * factor); // 110 (natural coral) to 175 (natural yellow)
        b = Math.round(110 + (90 - 110) * factor);  // 110 (natural coral) to 90 (natural yellow)
      } else {
        // Yellow to Green transition (50% to 100%) - natural yellow to sage
        const factor = (cappedPercentage - 50) / 50;
        r = Math.round(210 - (210 - 130) * factor); // 210 (natural yellow) to 130 (natural sage)
        g = Math.round(175 - (175 - 150) * factor); // 175 (natural yellow) to 150 (natural sage)
        b = Math.round(90 + (120 - 90) * factor);   // 90 (natural yellow) to 120 (natural sage)
      }
    }
    
    // Create glassy gradients with enhanced visibility for dark theme
    const baseOpacity = isDark ? 0.45 : 0.3;
    const primaryColor = `rgba(${r}, ${g}, ${b}, ${baseOpacity})`;
    const secondaryColor = `rgba(${r}, ${g}, ${b}, ${baseOpacity * 0.6})`;
    
    // Multi-stop gradient for more sophisticated glass effect
    const gradient = `linear-gradient(135deg, ${primaryColor} 0%, rgba(${r}, ${g}, ${b}, ${baseOpacity * 0.8}) 50%, ${secondaryColor} 100%)`;
    
    // Enhanced border visibility for dark theme
    const borderOpacity = isDark ? 0.6 : 0.45;
    const borderColor = `rgba(${r}, ${g}, ${b}, ${borderOpacity})`;
    
    // Text color - enhanced visibility for dark theme
    const textOpacity = isDark ? 0.95 : 0.75;
    const textColor = `rgba(${Math.round(r * 0.9)}, ${Math.round(g * 0.9)}, ${Math.round(b * 0.9)}, ${textOpacity})`;
    
    return { gradient, textColor, borderColor };
  }

  getOverallStatusEmoji(percentage: number): string {
    if (percentage >= 95) return '🏆'; // Trophy for exceptional achievement
    if (percentage >= 90) return '🎉'; // Party for great progress
    if (percentage >= 80) return '🔥'; // Fire for strong progress
    if (percentage >= 70) return '💪'; // Muscle for good progress
    if (percentage >= 60) return '📈'; // Chart for steady progress
    if (percentage >= 50) return '⚡'; // Lightning for halfway there
    if (percentage >= 30) return '🌱'; // Seedling for growing progress
    if (percentage >= 10) return '🏃‍♂️'; // Runner for getting started
    return '🌟'; // Star for motivation to begin
  }

} 