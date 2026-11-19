import {
  ApplicationStatus,
  DocumentRequestStatus,
  DocumentStatus,
  PrismaClient,
  ReviewDecision,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [users, documentTypes] = await Promise.all([
    prisma.user.findMany({
      select: { email: true, role: true },
      orderBy: { role: 'asc' },
    }),
    prisma.documentType.findMany({
      select: { code: true, name: true, active: true },
      orderBy: { code: 'asc' },
    }),
  ]);

  if (users.length < 3) {
    throw new Error('Expected seeded ADMIN, REVIEWER and APPLICANT users');
  }

  if (
    !documentTypes.some((type) => type.code === 'TRANSCRIPT') ||
    !documentTypes.some((type) => type.code === 'LANGUAGE_CERTIFICATE')
  ) {
    throw new Error('Expected TRANSCRIPT and LANGUAGE_CERTIFICATE document types');
  }

  const applicant = await prisma.user.findUniqueOrThrow({
    where: { email: 'applicant@docverify.local' },
  });
  const reviewer = await prisma.user.findUniqueOrThrow({
    where: { email: 'reviewer@docverify.local' },
  });
  const transcript = await prisma.documentType.findUniqueOrThrow({
    where: { code: 'TRANSCRIPT' },
  });
  const languageCertificate = await prisma.documentType.findUniqueOrThrow({
    where: { code: 'LANGUAGE_CERTIFICATE' },
  });

  const application = await prisma.application.create({
    data: {
      applicationNumber: `APP-REL-CHECK-${Date.now()}`,
      applicantId: applicant.id,
      status: ApplicationStatus.UNDER_REVIEW,
      notes: 'Temporary relationship verification record',
      documents: {
        create: {
          documentTypeId: transcript.id,
          originalFilename: 'transcript.pdf',
          storedFilename: 'transcript-verify.pdf',
          storagePath: '/uploads/transcript-verify.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          status: DocumentStatus.ACTIVE,
          uploadedById: applicant.id,
        },
      },
      reviewActions: {
        create: {
          reviewerId: reviewer.id,
          decision: ReviewDecision.NEEDS_INFORMATION,
          comment: 'Please upload language certificate',
        },
      },
      documentRequests: {
        create: {
          reviewerId: reviewer.id,
          documentTypeId: languageCertificate.id,
          message: 'Language certificate required',
          status: DocumentRequestStatus.OPEN,
        },
      },
    },
    include: {
      applicant: true,
      documents: { include: { documentType: true, uploadedBy: true } },
      reviewActions: { include: { reviewer: true } },
      documentRequests: { include: { documentType: true, reviewer: true } },
    },
  });

  const rule = await prisma.verificationRule.create({
    data: {
      title: 'Transcript authenticity check',
      description: 'Synthetic rule for relationship verification',
      documentTypeId: transcript.id,
      isActive: true,
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    },
    include: { documentType: true },
  });

  const audit = await prisma.auditLog.create({
    data: {
      actorId: reviewer.id,
      action: 'APPLICATION_REVIEWED',
      entityType: 'Application',
      entityId: application.id,
      metadata: { decision: ReviewDecision.NEEDS_INFORMATION },
    },
    include: { actor: true },
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        seedUsers: users,
        seedDocumentTypes: documentTypes,
        relationshipCheck: {
          applicationNumber: application.applicationNumber,
          applicant: application.applicant.email,
          documents: application.documents.map((document) => ({
            type: document.documentType.code,
            uploader: document.uploadedBy.email,
          })),
          reviews: application.reviewActions.map((action) => ({
            decision: action.decision,
            reviewer: action.reviewer.email,
          })),
          requests: application.documentRequests.map((request) => ({
            type: request.documentType.code,
            status: request.status,
          })),
          rule: { title: rule.title, type: rule.documentType.code },
          audit: { action: audit.action, actor: audit.actor?.email },
        },
      },
      null,
      2,
    ),
  );

  await prisma.auditLog.delete({ where: { id: audit.id } });
  await prisma.verificationRule.delete({ where: { id: rule.id } });
  await prisma.documentRequest.deleteMany({ where: { applicationId: application.id } });
  await prisma.reviewAction.deleteMany({ where: { applicationId: application.id } });
  await prisma.document.deleteMany({ where: { applicationId: application.id } });
  await prisma.application.delete({ where: { id: application.id } });
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
