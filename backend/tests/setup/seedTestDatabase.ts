import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

/**
 * Deterministic seed for the isolated test database.
 * Synthetic credentials only — never production records.
 */
export async function seedTestDatabase(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  const bcryptRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

  try {
    const documentTypes = [
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

    for (const type of documentTypes) {
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

    const users = [
      {
        role: UserRole.ADMIN,
        name: process.env.SEED_ADMIN_NAME ?? 'Test Administrator',
        email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.test').toLowerCase(),
        password: process.env.SEED_ADMIN_PASSWORD ?? 'TestAdminPass123!',
      },
      {
        role: UserRole.REVIEWER,
        name: process.env.SEED_REVIEWER_NAME ?? 'Test Reviewer',
        email: (process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@docverify.test').toLowerCase(),
        password: process.env.SEED_REVIEWER_PASSWORD ?? 'TestReviewerPass123!',
      },
      {
        role: UserRole.APPLICANT,
        name: process.env.SEED_APPLICANT_NAME ?? 'Test Applicant',
        email: (process.env.SEED_APPLICANT_EMAIL ?? 'applicant@docverify.test').toLowerCase(),
        password: process.env.SEED_APPLICANT_PASSWORD ?? 'TestApplicantPass123!',
      },
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, bcryptRounds);
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          passwordHash,
        },
        create: {
          name: user.name,
          email: user.email,
          role: user.role,
          passwordHash,
        },
      });
    }

    await prisma.referenceSource.upsert({
      where: {
        title_version: {
          title: 'DocVerify Verification Baseline',
          version: '1.0.0',
        },
      },
      update: {
        sourceDescription: 'Synthetic baseline reference for automated tests.',
        effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      },
      create: {
        title: 'DocVerify Verification Baseline',
        version: '1.0.0',
        effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
        sourceDescription: 'Synthetic baseline reference for automated tests.',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
