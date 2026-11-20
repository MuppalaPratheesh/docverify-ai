import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { seedTestDatabase } from './seedTestDatabase';

const backendRoot = path.resolve(__dirname, '../..');
const envTestPath = path.join(backendRoot, '.env.test');

// Preserve CI/process DATABASE_URL; `.env.test` only fills missing local defaults.
const presetDatabaseUrl = process.env.DATABASE_URL;
loadDotenv({ path: envTestPath, override: false });
if (presetDatabaseUrl) {
  process.env.DATABASE_URL = presetDatabaseUrl;
}

process.env.NODE_ENV = 'test';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://docverify_user:change_me_local_only@localhost:5433/docverify_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;

function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];

  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

function ensureTestDatabase(): void {
  const { host, port, user, password, database } = parseDatabaseUrl(TEST_DATABASE_URL);

  if (database !== 'docverify_test') {
    throw new Error(
      `Refusing to run tests against database "${database}". Expected "docverify_test".`,
    );
  }

  const env = {
    ...process.env,
    PGPASSWORD: password,
  };

  const exists = execSync(
    `psql -h ${host} -p ${port} -U ${user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${database}'"`,
    { env, encoding: 'utf8' },
  ).trim();

  if (exists !== '1') {
    execSync(
      `psql -h ${host} -p ${port} -U ${user} -d postgres -c "CREATE DATABASE \\"${database}\\""`,
      {
        env,
        stdio: 'inherit',
      },
    );
  }
}

export default async function globalSetup(): Promise<void> {
  ensureTestDatabase();

  const uploadDir = path.resolve(
    backendRoot,
    process.env.UPLOAD_DIR ?? './uploads-test',
  );
  fs.mkdirSync(uploadDir, { recursive: true });

  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
    },
  });

  await seedTestDatabase(TEST_DATABASE_URL);
}
