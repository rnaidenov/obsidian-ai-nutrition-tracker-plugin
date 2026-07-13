export class TAbstractFile {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() ?? path;
  }
}

export class TFile extends TAbstractFile {
  basename: string;
  extension: string;

  constructor(path: string) {
    super(path);
    const dotIndex = this.name.lastIndexOf('.');
    this.basename = dotIndex > -1 ? this.name.slice(0, dotIndex) : this.name;
    this.extension = dotIndex > -1 ? this.name.slice(dotIndex + 1) : '';
  }
}

export class TFolder extends TAbstractFile {}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export function normalizePath(path: string): string {
  return path;
}

export class Vault {
  getAbstractFileByPath(_path: string): TAbstractFile | null {
    return null;
  }

  async read(_file: TFile): Promise<string> {
    return '';
  }

  async modify(_file: TFile, _data: string): Promise<void> {}

  async create(path: string, _data: string): Promise<TFile> {
    return new TFile(path);
  }

  async createFolder(path: string): Promise<TFolder> {
    return new TFolder(path);
  }

  async process(_file: TFile, fn: (data: string) => string): Promise<string> {
    return fn('');
  }

  async rename(_file: TAbstractFile, _newPath: string): Promise<void> {}

  async createBinary(path: string, _data: ArrayBuffer): Promise<TFile> {
    return new TFile(path);
  }

  getFiles(): TFile[] {
    return [];
  }
}
