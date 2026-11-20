import { prisma } from '../../src/lib/prisma';

const SEED_EMAILS = [
  process.env.SEED_ADMIN_EMAIL ?? 'admin@docverify.test',
  process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@docverify.test',
  process.env.SEED_APPLICANT_EMAIL ?? 'applicant@docverify.test',
].map((email) => email.toLowerCase());

/**
 * Wipe mutable application data while preserving seeded roles and document types.
 * Keeps the suite deterministic without depending on production rows.
 */
export async function resetTransactionalData(): Promise<void> {
  await prisma.$transaction([
    prisma.reviewAction.deleteMany(),
    prisma.documentRequest.deleteMany(),
    prisma.document.deleteMany(),
    prisma.application.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.verificationRule.deleteMany(),
    prisma.referenceSource.deleteMany({
      where: {
        NOT: {
          AND: [{ title: 'DocVerify Verification Baseline' }, { version: '1.0.0' }],
        },
      },
    }),
    prisma.documentType.deleteMany({
      where: {
        NOT: {
          code: {
            in: ['TRANSCRIPT', 'LANGUAGE_CERTIFICATE'],
          },
        },
      },
    }),
    prisma.user.deleteMany({
      where: {
        email: {
          notIn: SEED_EMAILS,
        },
      },
    }),
  ]);
}

export async function getSeedUserIds(): Promise<{
  adminId: string;
  reviewerId: string;
  applicantId: string;
}> {
  const [admin, reviewer, applicant] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { email: SEED_EMAILS[0] },
      select: { id: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: SEED_EMAILS[1] },
      select: { id: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: SEED_EMAILS[2] },
      select: { id: true },
    }),
  ]);

  return {
    adminId: admin.id,
    reviewerId: reviewer.id,
    applicantId: applicant.id,
  };
}
