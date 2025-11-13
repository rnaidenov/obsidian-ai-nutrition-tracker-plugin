export class ThemeUtils {
  getEffectiveTheme(): 'light' | 'dark' {
    // Always detect from Obsidian's theme
    return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
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