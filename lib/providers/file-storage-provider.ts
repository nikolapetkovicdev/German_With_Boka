import {randomUUID} from 'crypto';
import {mkdir, readFile, writeFile} from 'fs/promises';
import path from 'path';
import {fileTypeFromBuffer} from 'file-type';
import {MAX_UPLOAD_BYTES, SAFE_UPLOAD_MIME_TYPES} from '@/lib/config';

export type StoredFile = {storageKey: string; mimeType: string; byteSize: number};
export type LoadedFile = {bytes: Buffer; mimeType: string};

export interface FileStorageProvider {
  savePrivateFile(file: File): Promise<StoredFile>;
  readPrivateFile(storageKey: string, mimeType: string): Promise<LoadedFile>;
}

export class LocalPrivateFileStorageProvider implements FileStorageProvider {
  async savePrivateFile(file: File) {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('FILE_TOO_LARGE');
    const detected = await fileTypeFromBuffer(bytes);
    const mimeType = detected?.mime ?? file.type;
    if (!SAFE_UPLOAD_MIME_TYPES.has(mimeType)) throw new Error('UNSAFE_FILE_TYPE');
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    await mkdir(uploadDir, {recursive: true});
    const storageKey = `${randomUUID()}.${detected?.ext || 'bin'}`;
    await writeFile(path.join(uploadDir, storageKey), bytes);
    return {storageKey, mimeType, byteSize: bytes.length};
  }

  async readPrivateFile(storageKey: string, mimeType: string) {
    if (storageKey.includes('..') || storageKey.includes('/') || storageKey.includes('\\')) throw new Error('INVALID_STORAGE_KEY');
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const bytes = await readFile(path.join(uploadDir, storageKey));
    return {bytes, mimeType};
  }
}

export const fileStorageProvider = new LocalPrivateFileStorageProvider();
