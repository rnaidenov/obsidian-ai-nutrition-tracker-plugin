import { TFile, TFolder, Vault } from 'obsidian';

export function createFakeVault(initialFiles: Record<string, string> = {}) {
  const files = new Map(Object.entries(initialFiles));
  const folders = new Set<string>();

  const vault: Vault = {
    getAbstractFileByPath: jest.fn((path: string) => {
      if (files.has(path)) return new TFile(path);
      if (folders.has(path)) return new TFolder(path);
      return null;
    }),
    read: jest.fn(async (file: TFile) => files.get(file.path) ?? ''),
    modify: jest.fn(async (file: TFile, data: string) => {
      files.set(file.path, data);
    }),
    create: jest.fn(async (path: string, data: string) => {
      files.set(path, data);
      return new TFile(path);
    }),
    createFolder: jest.fn(async (path: string) => {
      folders.add(path);
      return new TFolder(path);
    }),
    process: jest.fn(async (file: TFile, fn: (data: string) => string) => {
      const result = fn(files.get(file.path) ?? '');
      files.set(file.path, result);
      return result;
    }),
    rename: jest.fn(async (file, newPath: string) => {
      const content = files.get(file.path);
      files.delete(file.path);
      if (content !== undefined) files.set(newPath, content);
    }),
    createBinary: jest.fn(async (path: string) => new TFile(path)),
    getFiles: jest.fn(() => [...files.keys()].map(path => new TFile(path))),
  };

  return { vault, files, folders };
}
