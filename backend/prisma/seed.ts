import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';

loadDotenv({ path: path.resolve(process.cwd(), '../.env') });
loadDotenv({ path: path.resolve(process.cwd(), '.env'), override: true });

const prisma = new PrismaClient();

type SeedUserConfig = {
  role: UserRole;
  nameEnv: string;
  emailEnv: string;
  passwordEnv: string;
  defaultName: string;
  defaultEmail: string;
};

const seedUsers: SeedUserConfig[] = [
  {
    role: UserRole.ADMIN,
    nameEnv: 'SEED_ADMIN_NAME',
    emailEnv: 'SEED_ADMIN_EMAIL',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    defaultName: 'System Administrator',
    defaultEmail: 'admin@docverify.local',
  },
  {
    role: UserRole.REVIEWER,
    nameEnv: 'SEED_REVIEWER_NAME',
    emailEnv: 'SEED_REVIEWER_EMAIL',
    passwordEnv: 'SEED_REVIEWER_PASSWORD',
    defaultName: 'Document Reviewer',
    defaultEmail: 'reviewer@docverify.local',
  },
  {
    role: UserRole.APPLICANT,
    nameEnv: 'SEED_APPLICANT_NAME',
    emailEnv: 'SEED_APPLICANT_EMAIL',
    passwordEnv: 'SEED_APPLICANT_PASSWORD',
    defaultName: 'Synthetic Applicant',
    defaultEmail: 'applicant@docverify.local',
  },
];

function requireSeedPassword(envName: string, role: UserRole): string {
  const value = process.env[envName]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${envName}. Set synthetic ${role} credentials in .env before seeding.`,
    );
  }

  if (value.length < 8) {
    throw new Error(`${envName} must be at least 8 characters.`);
  }

  return value;
}

async function upsertDocumentTypes() {
  const types = [
    {
      code: 'TRANSCRIPT',
      name: 'Academic Transcript',
      description: 'Official academic transcript listing completed coursework and grades.',
    },
    {
      code: 'LANGUAGE_CERTIFICATE',
      name: 'Language Certificate',
      description: 'Certificate proving language proficiency for academic admission.',
    },
  ];

  for (const type of types) {
    await prisma.documentType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        description: type.description,
        active: true,
      },
      create: {
        ...type,
        active: true,
      },
    });
  }
}

async function upsertSeedUsers() {
  const bcryptRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

  for (const user of seedUsers) {
    const name = process.env[user.nameEnv]?.trim() || user.defaultName;
    const email = (process.env[user.emailEnv]?.trim() || user.defaultEmail).toLowerCase();
    const password = requireSeedPassword(user.passwordEnv, user.role);
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role: user.role,
        passwordHash,
      },
      create: {
        name,
        email,
        role: user.role,
        passwordHash,
      },
    });
  }
}

async function seedReferenceBaseline() {
  await prisma.referenceSource.upsert({
    where: {
      title_version: {
        title: 'DocVerify Verification Baseline',
        version: '1.0.0',
      },
    },
    update: {
      sourceDescription: 'Synthetic baseline reference for local development and testing.',
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    },
    create: {
      title: 'DocVerify Verification Baseline',
      version: '1.0.0',
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      sourceDescription: 'Synthetic baseline reference for local development and testing.',
    },
  });
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding DocVerify AI database...');

  await upsertDocumentTypes();
  await upsertSeedUsers();
  await seedReferenceBaseline();

  const [users, documentTypes, referenceSources] = await Promise.all([
    prisma.user.findMany({
      select: { email: true, role: true, name: true },
      orderBy: { role: 'asc' },
    }),
    prisma.documentType.findMany({
      select: { code: true, name: true, active: true },
      orderBy: { code: 'asc' },
    }),
    prisma.referenceSource.count(),
  ]);

  // eslint-disable-next-line no-console
  console.log('Seeded users:');
  for (const user of users) {
    // eslint-disable-next-line no-console
    console.log(`  - ${user.role}: ${user.email} (${user.name})`);
  }

  // eslint-disable-next-line no-console
  console.log('Seeded document types:');
  for (const type of documentTypes) {
    // eslint-disable-next-line no-console
    console.log(`  - ${type.code}: ${type.name} (active=${type.active})`);
  }

  // eslint-disable-next-line no-console
  console.log(`Reference sources: ${referenceSources}`);
  // eslint-disable-next-line no-console
  console.log('Seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
