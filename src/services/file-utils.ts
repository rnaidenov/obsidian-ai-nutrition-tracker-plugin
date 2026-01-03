import { TFile, Vault, TAbstractFile, normalizePath } from 'obsidian';

// Dependencies interface
export interface FileUtilsDeps {
  vault: Vault;
}

// I/O operations (require vault dependency)
export async function ensureDirectoryExists(
  deps: FileUtilsDeps,
  path: string
): Promise<void> {
  const exists = deps.vault.getAbstractFileByPath(path);
  if (!exists) {
    await deps.vault.createFolder(path);
  }
}

export async function saveImage(
  deps: FileUtilsDeps,
  imageFile: File,
  imageStoragePath: string
): Promise<string> {
  try {
    await ensureDirectoryExists(deps, imageStoragePath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = imageFile.name.split('.').pop() || 'jpg';
    const filename = `food-image-${timestamp}.${extension}`;
    const imagePath = normalizePath(`${imageStoragePath}/${filename}`);

    // Convert File to ArrayBuffer
    const arrayBuffer = await imageFile.arrayBuffer();
    await deps.vault.createBinary(imagePath, arrayBuffer);

    return imagePath;
  } catch (error) {
    console.error('Error saving image:', error);
    throw new Error(`Failed to save image: ${error.message}`);
  }
}

export function isMealNote(
  file: TAbstractFile,
  mealStoragePath: string,
  logStoragePath: string
): boolean {
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

// Pure utility functions (no dependencies needed)
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateMealId(): string {
  return 'meal_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
}

export function sanitizeMealName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
}

export function convertFilenameToReadableName(filename: string): string {
  return filename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}
