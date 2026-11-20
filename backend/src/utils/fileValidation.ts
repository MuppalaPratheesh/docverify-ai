import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../middleware/errorHandler';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<AllowedMimeType, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function extensionForMime(mimeType: AllowedMimeType): string {
  return MIME_TO_EXTENSION[mimeType];
}

export function detectMimeFromSignature(buffer: Buffer): AllowedMimeType | null {
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return 'application/pdf';
  }

  // Some PDFs may start with %PDF without hyphen immediately in rare cases; also accept %PDF
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  return null;
}

export async function validateUploadedFile(filePath: string, claimedMime: string): Promise<AllowedMimeType> {
  const handle = await fs.open(filePath, 'r');

  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, 16, 0);
    const signatureMime = detectMimeFromSignature(header.subarray(0, bytesRead));

    if (!signatureMime) {
      throw new AppError('File content does not match an allowed PDF, JPG or PNG signature', 400);
    }

    if (!isAllowedMimeType(claimedMime)) {
      throw new AppError('Unsupported file type. Allowed types: PDF, JPG, PNG', 400);
    }

    if (claimedMime !== signatureMime) {
      throw new AppError('Declared MIME type does not match the file contents', 400);
    }

    return signatureMime;
  } finally {
    await handle.close();
  }
}

export function resolveSafeStoragePath(uploadRoot: string, storedFilename: string): string {
  const normalizedRoot = path.resolve(uploadRoot);
  const candidate = path.resolve(normalizedRoot, storedFilename);

  if (
    candidate !== normalizedRoot &&
    !candidate.startsWith(`${normalizedRoot}${path.sep}`)
  ) {
    throw new AppError('Invalid document storage path', 400);
  }

  // Disallow nested path segments from stored filenames.
  if (path.basename(storedFilename) !== storedFilename) {
    throw new AppError('Invalid document storage path', 400);
  }

  return candidate;
}
