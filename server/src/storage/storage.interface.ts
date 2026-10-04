export interface StorageResult {
  storageKey: string;
  size: number;
  mimeType?: string;
}

export interface StorageService {
  save(
    key: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<StorageResult>;

  get(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;

  getAbsolutePath(key: string): string;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
