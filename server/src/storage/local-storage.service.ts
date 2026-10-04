import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageService, StorageResult } from './storage.interface.js';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly baseDir: string;

  constructor(private readonly configService: ConfigService) {
    const configuredDir =
      this.configService.get<string>('UPLOADS_DIR') ||
      process.env.UPLOADS_DIR ||
      'uploads';

    this.baseDir = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.join(process.cwd(), configuredDir);

    this.initBaseDir().catch((err) => {
      this.logger.error(`Failed to initialize upload directory "${this.baseDir}": ${err.message}`);
    });
  }

  private async initBaseDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (err: any) {
      this.logger.error(`Error creating uploads directory: ${err.message}`);
    }
  }

  private resolveSafePath(key: string): string {
    const cleanKey = key.replace(/^[/\\]+/, '');
    const resolved = path.resolve(this.baseDir, cleanKey);

    if (!resolved.startsWith(this.baseDir)) {
      throw new BadRequestException('Invalid storage key: directory traversal detected.');
    }

    return resolved;
  }

  getAbsolutePath(key: string): string {
    return this.resolveSafePath(key);
  }

  async save(
    key: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<StorageResult> {
    const targetPath = this.resolveSafePath(key);
    const parentDir = path.dirname(targetPath);

    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(targetPath, buffer);

    const relativeKey = path.relative(this.baseDir, targetPath).replace(/\\/g, '/');

    return {
      storageKey: relativeKey,
      size: buffer.length,
      mimeType,
    };
  }

  async get(key: string): Promise<Buffer> {
    const targetPath = this.resolveSafePath(key);

    try {
      return await fs.readFile(targetPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException(`File for storage key "${key}" not found on disk.`);
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const targetPath = this.resolveSafePath(key);

    try {
      await fs.unlink(targetPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        this.logger.warn(`Could not delete storage file "${key}": ${err.message}`);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const targetPath = this.resolveSafePath(key);

    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
