import { TFile, Vault, TAbstractFile, normalizePath } from 'obsidian';

export class FileUtils {
  constructor(private vault: Vault) {}

  async ensureDirectoryExists(path: string): Promise<void> {
    const dirs = path.split('/');
    let currentPath = '';
    
    for (const dir of dirs) {
      currentPath = currentPath ? `${currentPath}/${dir}` : dir;
      
      const exists = this.vault.getAbstractFileByPath(currentPath);

      if (exists) {
        return;
      }

      try {
        await this.vault.createFolder(currentPath);
      } catch (error) {
        throw new Error(`Failed to create directory ${currentPath}: ${error.message}`);
      }
    }
  }

  async saveImage(imageFile: File, imageStoragePath: string): Promise<string> {
    try {
      await this.ensureDirectoryExists(imageStoragePath);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = imageFile.name.split('.').pop() || 'jpg';
      const filename = `food-image-${timestamp}.${extension}`;
      const imagePath = normalizePath(`${imageStoragePath}/${filename}`);
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await imageFile.arrayBuffer();
      await this.vault.createBinary(imagePath, arrayBuffer);
      
      return imagePath;
    } catch (error) {
      console.error('Error saving image:', error);
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  getTodayString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  generateMealId(): string {
    return 'meal_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  sanitizeMealName(name: string): string {
    return name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
  }

  isMealNote(file: TAbstractFile, mealStoragePath: string, logStoragePath: string): boolean {
    if (!(file instanceof TFile)) return false;
    
    // Check if file is in meal storage path and has .md extension
    const normalizedFilePath = normalizePath(file.path);
    const normalizedMealPath = normalizePath(mealStoragePath);
    const normalizedLogPath = normalizePath(logStoragePath);
    
    // Must be in meal storage path
    const inMealPath = normalizedFilePath.startsWith(normalizedMealPath);
    
    // Must NOT be in log storage path (prevent cross-contamination)
    const inLogPath = normalizedFilePath.startsWith(normalizedLogPath);
    
    // Must have .md extension and not be meals.json
    const validExtension = file.extension === 'md' && file.name !== 'meals.json';
    
    // Must not be a food log (food logs typically have format "YYYY-MM-DD.md")
    const isFoodLog = /^\d{4}-\d{2}-\d{2}\.md$/.test(file.name);
    
    const isMealNote = inMealPath && !inLogPath && validExtension && !isFoodLog;
    
    return isMealNote;
  }
} 