export class ThemeUtils {
  getEffectiveTheme(): 'light' | 'dark' {
    // Always detect from Obsidian's theme
    return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  }


  getProgressToneClass(percentage: number): string {
    if (!Number.isFinite(percentage)) {
      return 'ntr-progress-tone-critical';
    }
    
    const normalized = Math.max(0, Math.round(percentage));
    
    if (normalized >= 140) {
      return 'ntr-progress-tone-surplus';
    }
    
    if (normalized >= 100) {
      return 'ntr-progress-tone-goal';
    }
    
    if (normalized >= 80) {
      return 'ntr-progress-tone-strong';
    }
    
    if (normalized >= 60) {
      return 'ntr-progress-tone-progress';
    }
    
    if (normalized >= 30) {
      return 'ntr-progress-tone-early';
    }
    
    return 'ntr-progress-tone-critical';
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