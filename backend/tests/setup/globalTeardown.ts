import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

const backendRoot = path.resolve(__dirname, '../..');
loadDotenv({ path: path.join(backendRoot, '.env.test'), override: true });

export default async function globalTeardown(): Promise<void> {
  const uploadDir = path.resolve(
    backendRoot,
    process.env.UPLOAD_DIR ?? './uploads-test',
  );

  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
}
