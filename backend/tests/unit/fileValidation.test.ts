import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  detectMimeFromSignature,
  isAllowedMimeType,
  resolveSafeStoragePath,
  validateUploadedFile,
} from '../../src/utils/fileValidation';
import { AppError } from '../../src/middleware/errorHandler';
import {
  cleanupFiles,
  createFakeTextFile,
  createSyntheticJpeg,
  createSyntheticPdf,
  createSyntheticPng,
} from '../helpers/syntheticFiles';

describe('File validation', () => {
  const tempFiles: string[] = [];

  afterAll(() => {
    cleanupFiles(tempFiles);
  });

  it('accepts allowed MIME types only', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(true);
    expect(isAllowedMimeType('image/jpeg')).toBe(true);
    expect(isAllowedMimeType('image/png')).toBe(true);
    expect(isAllowedMimeType('text/plain')).toBe(false);
    expect(isAllowedMimeType('application/msword')).toBe(false);
  });

  it('detects PDF, JPEG and PNG signatures from synthetic bytes', () => {
    const pdf = fs.readFileSync(createSyntheticPdf());
    const jpeg = fs.readFileSync(createSyntheticJpeg());
    const png = fs.readFileSync(createSyntheticPng());
    tempFiles.push(
      ...[
        // recreate paths already written by helpers — track via new writes below
      ],
    );

    expect(detectMimeFromSignature(pdf)).toBe('application/pdf');
    expect(detectMimeFromSignature(jpeg)).toBe('image/jpeg');
    expect(detectMimeFromSignature(png)).toBe('image/png');
    expect(detectMimeFromSignature(Buffer.from('hello'))).toBeNull();
  });

  it('validates synthetic PDF uploads that match the claimed MIME type', async () => {
    const pdfPath = createSyntheticPdf();
    tempFiles.push(pdfPath);

    await expect(validateUploadedFile(pdfPath, 'application/pdf')).resolves.toBe(
      'application/pdf',
    );
  });

  it('rejects text files disguised as PDFs', async () => {
    const fakePath = createFakeTextFile(
      path.join(os.tmpdir(), `docverify-disguised-${Date.now()}.pdf`),
    );
    tempFiles.push(fakePath);

    await expect(validateUploadedFile(fakePath, 'application/pdf')).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('rejects MIME mismatches between claim and content', async () => {
    const pdfPath = createSyntheticPdf();
    tempFiles.push(pdfPath);

    await expect(validateUploadedFile(pdfPath, 'image/png')).rejects.toBeInstanceOf(AppError);
  });

  it('rejects path traversal in stored filenames', () => {
    const root = path.join(os.tmpdir(), 'docverify-upload-root');
    fs.mkdirSync(root, { recursive: true });

    expect(() => resolveSafeStoragePath(root, '../secret.pdf')).toThrow(AppError);
    expect(() => resolveSafeStoragePath(root, 'nested/secret.pdf')).toThrow(AppError);
    expect(resolveSafeStoragePath(root, 'safe-file.pdf')).toBe(path.join(root, 'safe-file.pdf'));
  });
});
