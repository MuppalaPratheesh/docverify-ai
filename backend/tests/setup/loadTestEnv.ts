import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * Runs before test modules import the app so DATABASE_URL / NODE_ENV are correct.
 * Values already set by CI / the shell take precedence over `.env.test`.
 */
const backendRoot = path.resolve(__dirname, '../..');
const envTestPath = path.join(backendRoot, '.env.test');

const preset = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
  SEED_REVIEWER_EMAIL: process.env.SEED_REVIEWER_EMAIL,
  SEED_REVIEWER_PASSWORD: process.env.SEED_REVIEWER_PASSWORD,
  SEED_APPLICANT_EMAIL: process.env.SEED_APPLICANT_EMAIL,
  SEED_APPLICANT_PASSWORD: process.env.SEED_APPLICANT_PASSWORD,
};

if (fs.existsSync(envTestPath)) {
  loadDotenv({ path: envTestPath, override: false });
}

process.env.NODE_ENV = 'test';

for (const [key, value] of Object.entries(preset)) {
  if (value !== undefined && value !== '') {
    process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('docverify_test')) {
  process.env.DATABASE_URL =
    'postgresql://docverify_user:change_me_local_only@localhost:5433/docverify_test?schema=public';
}

process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test_only_jwt_secret_do_not_reuse';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads-test';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ?? '10';

process.env.SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.test';
process.env.SEED_ADMIN_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? 'TestAdminPass123!';
process.env.SEED_REVIEWER_EMAIL =
  process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@docverify.test';
process.env.SEED_REVIEWER_PASSWORD =
  process.env.SEED_REVIEWER_PASSWORD ?? 'TestReviewerPass123!';
process.env.SEED_APPLICANT_EMAIL =
  process.env.SEED_APPLICANT_EMAIL ?? 'applicant@docverify.test';
process.env.SEED_APPLICANT_PASSWORD =
  process.env.SEED_APPLICANT_PASSWORD ?? 'TestApplicantPass123!';
