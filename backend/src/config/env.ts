import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';

// Preserve an explicit test mode set by Jest before dotenv overrides it.
const requestedTestMode = process.env.NODE_ENV === 'test';
const presetTestDatabaseUrl = process.env.DATABASE_URL;
const presetJwtSecret = process.env.JWT_SECRET;

// Load root .env first, then backend/.env with override so local values win.
loadDotenv({ path: path.resolve(process.cwd(), '../.env') });
loadDotenv({ path: path.resolve(process.cwd(), '.env'), override: true });

// Automated tests must never inherit the development database URL.
if (requestedTestMode) {
  loadDotenv({ path: path.resolve(process.cwd(), '.env.test'), override: true });
  process.env.NODE_ENV = 'test';

  // CI / shell-provided values win over local dotenv files.
  if (presetTestDatabaseUrl) {
    process.env.DATABASE_URL = presetTestDatabaseUrl;
  }
  if (presetJwtSecret) {
    process.env.JWT_SECRET = presetJwtSecret;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .describe('PostgreSQL connection string used by Prisma'),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_REVIEWER_EMAIL: z.string().email().optional(),
  SEED_REVIEWER_PASSWORD: z.string().min(8).optional(),
  SEED_APPLICANT_EMAIL: z.string().email().optional(),
  SEED_APPLICANT_PASSWORD: z.string().min(8).optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('dev_only_replace_with_secure_secret'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  COOKIE_NAME: z.string().default('docverify_session'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  COOKIE_HTTP_ONLY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10_485_760),
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  if (
    parsed.data.NODE_ENV === 'production' &&
    parsed.data.JWT_SECRET === 'dev_only_replace_with_secure_secret'
  ) {
    throw new Error('JWT_SECRET must be set to a secure value in production');
  }

  return parsed.data;
}

export const env = validateEnv();
