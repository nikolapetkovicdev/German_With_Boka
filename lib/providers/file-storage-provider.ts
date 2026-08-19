import {randomUUID} from 'crypto';
import {mkdir, writeFile} from 'fs/promises';
import path from 'path';
import {fileTypeFromBuffer} from 'file-type';
import {MAX_UPLOAD_BYTES, SAFE_UPLOAD_MIME_TYPES} from '@/lib/config';

export type StoredFile = {storageKey: string; mimeType: string; byteSize: number};

export interface FileStorageProvider {
  savePrivateFile(file: File): Promise<StoredFile>;
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
}

export const fileStorageProvider = new LocalPrivateFileStorageProvider();
