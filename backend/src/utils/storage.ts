import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';

export function getUploadRoot(): string {
  const absolute = path.isAbsolute(env.UPLOAD_DIR)
    ? env.UPLOAD_DIR
    : path.resolve(process.cwd(), env.UPLOAD_DIR);

  fs.mkdirSync(absolute, { recursive: true });
  return absolute;
}
