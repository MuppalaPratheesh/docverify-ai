import fs from 'node:fs';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { ALLOWED_MIME_TYPES, isAllowedMimeType } from '../utils/fileValidation';
import { getUploadRoot } from '../utils/storage';

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    try {
      const uploadRoot = getUploadRoot();
      fs.mkdirSync(uploadRoot, { recursive: true });
      callback(null, uploadRoot);
    } catch (error) {
      callback(error as Error, '');
    }
  },
  filename(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeExtension =
      extension === '.pdf' || extension === '.jpg' || extension === '.jpeg' || extension === '.png'
        ? extension === '.jpeg'
          ? '.jpg'
          : extension
        : '';

    // Temporary name; service renames after signature validation when needed.
    callback(null, `${randomUUID()}${safeExtension || '.bin'}`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
): void {
  if (!isAllowedMimeType(file.mimetype)) {
    callback(
      new AppError(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        400,
      ),
    );
    return;
  }

  callback(null, true);
}

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
}).single('file');
