import {
  ApplicationStatus,
  Prisma,
  ReviewDecision,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/express';
import type {
  CreateDocumentRequestInput,
  RecordDecisionInput,
  ReviewerApplicationQuery,
  UpdateReviewerNotesInput,
} from '../validators/reviewerValidators';
import {
  canRecordReviewDecision,
  canRequestAdditionalDocuments,
  nextStatusForDecision,
} from '../utils/applicationStatus';
import { writeAuditLog } from './auditService';
import { assertCanAccessApplication, assertCanRecordReview } from './authorizationService';

const reviewerDetailInclude = {
  applicant: {
    select: { id: true, name: true, email: true, createdAt: true },
  },
  documents: {
    include: {
      documentType: {
        select: { id: true, code: true, name: true },
      },
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { uploadedAt: 'desc' as const },
  },
  documentRequests: {
    include: {
      documentType: {
        select: { id: true, code: true, name: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  reviewActions: {
    include: {
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

function ensureReviewer(user: AuthUser): void {
  if (user.role !== UserRole.REVIEWER && user.role !== UserRole.ADMIN) {
    throw new AppError('Reviewer access required', 403);
  }
}

export async function getReviewerDashboardStats(user: AuthUser) {
  ensureReviewer(user);

  const grouped = await prisma.application.groupBy({
    by: ['status'],
    where: {
      status: { not: ApplicationStatus.DRAFT },
    },
    _count: { _all: true },
  });

  const counts = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    NEEDS_INFORMATION: 0,
    COMPLETED: 0,
    total: 0,
  };

  for (const row of grouped) {
    counts.total += row._count._all;

    if (row.status === ApplicationStatus.SUBMITTED) {
      counts.SUBMITTED = row._count._all;
    } else if (row.status === ApplicationStatus.UNDER_REVIEW) {
      counts.UNDER_REVIEW = row._count._all;
    } else if (row.status === ApplicationStatus.NEEDS_INFORMATION) {
      counts.NEEDS_INFORMATION = row._count._all;
    } else if (row.status === ApplicationStatus.COMPLETED) {
      counts.COMPLETED = row._count._all;
    }
  }

  const openRequests = await prisma.documentRequest.count({
    where: { status: 'OPEN' },
  });

  const recentDecisions = await prisma.reviewAction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
      application: {
        select: {
          id: true,
          applicationNumber: true,
          status: true,
          applicant: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return { counts, openRequests, recentDecisions };
}

export async function listReviewerApplications(
  user: AuthUser,
  query: ReviewerApplicationQuery,
) {
  ensureReviewer(user);

  const where: Prisma.ApplicationWhereInput = {
    status: query.status ?? { not: ApplicationStatus.DRAFT },
  };

  if (query.q) {
    where.OR = [
      { applicationNumber: { contains: query.q, mode: 'insensitive' } },
      { applicant: { name: { contains: query.q, mode: 'insensitive' } } },
      { applicant: { email: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  return prisma.application.findMany({
    where,
    include: {
      applicant: {
        select: { id: true, name: true, email: true },
      },
      documents: {
        where: { status: 'ACTIVE' },
        include: {
          documentType: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      _count: {
        select: {
          documents: true,
          documentRequests: true,
          reviewActions: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
}

export async function getReviewerApplication(user: AuthUser, applicationId: string) {
  ensureReviewer(user);
  await assertCanAccessApplication(user, applicationId);

  let application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: reviewerDetailInclude,
  });

  if (!application || application.status === ApplicationStatus.DRAFT) {
    throw new AppError('Application not found', 404);
  }

  if (application.status === ApplicationStatus.SUBMITTED) {
    application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.UNDER_REVIEW },
      include: reviewerDetailInclude,
    });

    await writeAuditLog({
      actorId: user.id,
      action: 'APPLICATION_UNDER_REVIEW',
      entityType: 'Application',
      entityId: application.id,
      metadata: { previousStatus: ApplicationStatus.SUBMITTED },
    });
  }

  return application;
}

export async function updateReviewerNotes(
  user: AuthUser,
  applicationId: string,
  input: UpdateReviewerNotesInput,
) {
  ensureReviewer(user);
  assertCanRecordReview(user);
  await assertCanAccessApplication(user, applicationId);

  const existing = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });

  if (!existing || existing.status === ApplicationStatus.DRAFT) {
    throw new AppError('Application not found', 404);
  }

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: {
      reviewerNotes: input.reviewerNotes,
    },
    include: reviewerDetailInclude,
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'REVIEWER_NOTES_UPDATED',
    entityType: 'Application',
    entityId: application.id,
  });

  return application;
}

export async function recordReviewDecision(
  user: AuthUser,
  applicationId: string,
  input: RecordDecisionInput,
) {
  ensureReviewer(user);
  assertCanRecordReview(user);
  await assertCanAccessApplication(user, applicationId);

  const existing = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });

  if (!existing || existing.status === ApplicationStatus.DRAFT) {
    throw new AppError('Application not found', 404);
  }

  if (!canRecordReviewDecision(existing.status)) {
    throw new AppError('This application has already been completed', 400);
  }

  const nextStatus = nextStatusForDecision(input.decision);

  const result = await prisma.$transaction(async (tx) => {
    const reviewAction = await tx.reviewAction.create({
      data: {
        applicationId,
        reviewerId: user.id,
        decision: input.decision,
        comment: input.comment,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const application = await tx.application.update({
      where: { id: applicationId },
      data: { status: nextStatus },
      include: reviewerDetailInclude,
    });

    return { reviewAction, application };
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'REVIEW_DECISION_RECORDED',
    entityType: 'Application',
    entityId: applicationId,
    metadata: {
      decision: input.decision,
      nextStatus,
      reviewActionId: result.reviewAction.id,
    },
  });

  return result;
}

export async function createDocumentRequest(
  user: AuthUser,
  applicationId: string,
  input: CreateDocumentRequestInput,
) {
  ensureReviewer(user);
  assertCanRecordReview(user);
  await assertCanAccessApplication(user, applicationId);

  const existing = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });

  if (!existing || existing.status === ApplicationStatus.DRAFT) {
    throw new AppError('Application not found', 404);
  }

  if (!canRequestAdditionalDocuments(existing.status)) {
    throw new AppError('Cannot request documents for a completed application', 400);
  }

  const documentType = await prisma.documentType.findFirst({
    where: { id: input.documentTypeId, active: true },
  });

  if (!documentType) {
    throw new AppError('Document type not found or inactive', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.documentRequest.create({
      data: {
        applicationId,
        reviewerId: user.id,
        documentTypeId: documentType.id,
        message: input.message,
        status: 'OPEN',
      },
      include: {
        documentType: {
          select: { id: true, code: true, name: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const application = await tx.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.NEEDS_INFORMATION },
      include: reviewerDetailInclude,
    });

    await tx.reviewAction.create({
      data: {
        applicationId,
        reviewerId: user.id,
        decision: ReviewDecision.NEEDS_INFORMATION,
        comment: `Document request: ${documentType.name} — ${input.message}`,
      },
    });

    return { request, application };
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'DOCUMENT_REQUEST_CREATED',
    entityType: 'DocumentRequest',
    entityId: result.request.id,
    metadata: {
      applicationId,
      documentTypeId: documentType.id,
      documentTypeCode: documentType.code,
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'APPLICATION_NEEDS_INFORMATION',
    entityType: 'Application',
    entityId: applicationId,
    metadata: { documentRequestId: result.request.id },
  });

  return result;
}
