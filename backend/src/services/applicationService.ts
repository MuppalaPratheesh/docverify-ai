import { randomBytes } from 'node:crypto';
import { ApplicationStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/express';
import type { CreateApplicationInput, UpdateApplicationInput } from '../validators/applicationValidators';
import { canEditApplicationNotes, canSubmitApplication } from '../utils/applicationStatus';
import { writeAuditLog } from './auditService';
import { assertCanAccessApplication } from './authorizationService';

const applicationInclude = {
  documents: {
    include: {
      documentType: {
        select: { id: true, code: true, name: true },
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
} as const;

function generateApplicationNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `APP-${stamp}-${suffix}`;
}

export async function createApplication(user: AuthUser, input: CreateApplicationInput) {
  if (user.role !== UserRole.APPLICANT && user.role !== UserRole.ADMIN) {
    throw new AppError('Only applicants can create applications', 403);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const applicationNumber = generateApplicationNumber();

    try {
      const application = await prisma.application.create({
        data: {
          applicationNumber,
          applicantId: user.id,
          status: ApplicationStatus.DRAFT,
          notes: input.notes,
        },
        include: applicationInclude,
      });

      await writeAuditLog({
        actorId: user.id,
        action: 'APPLICATION_CREATED',
        entityType: 'Application',
        entityId: application.id,
        metadata: { applicationNumber: application.applicationNumber },
      });

      return application;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AppError('Unable to create application number', 500);
}

export async function listApplications(user: AuthUser) {
  const where =
    user.role === UserRole.APPLICANT
      ? { applicantId: user.id }
      : user.role === UserRole.REVIEWER
        ? { status: { not: ApplicationStatus.DRAFT } }
        : {};

  return prisma.application.findMany({
    where,
    include: {
      applicant: {
        select: { id: true, name: true, email: true },
      },
      documents: {
        where: { status: 'ACTIVE' },
        select: { id: true, status: true, documentTypeId: true },
      },
      _count: {
        select: {
          documents: true,
          documentRequests: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getApplicationById(user: AuthUser, applicationId: string) {
  await assertCanAccessApplication(user, applicationId);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      ...applicationInclude,
      applicant: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (user.role === UserRole.APPLICANT && application.applicantId !== user.id) {
    throw new AppError('You do not have access to this application', 403);
  }

  return application;
}

export async function updateApplicationNotes(
  user: AuthUser,
  applicationId: string,
  input: UpdateApplicationInput,
) {
  const application = await getApplicationById(user, applicationId);

  if (user.role === UserRole.APPLICANT && application.applicantId !== user.id) {
    throw new AppError('You do not have access to this application', 403);
  }

  if (!canEditApplicationNotes(application.status)) {
    throw new AppError('Notes can only be edited while the application is in DRAFT', 400);
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      notes: input.notes ?? null,
    },
    include: applicationInclude,
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'APPLICATION_NOTES_UPDATED',
    entityType: 'Application',
    entityId: updated.id,
  });

  return updated;
}

export async function submitApplication(user: AuthUser, applicationId: string) {
  const application = await getApplicationById(user, applicationId);

  if (user.role === UserRole.APPLICANT && application.applicantId !== user.id) {
    throw new AppError('You do not have access to this application', 403);
  }

  if (!canSubmitApplication(application.status)) {
    throw new AppError('Only draft applications can be submitted', 400);
  }

  const activeDocuments = application.documents.filter((document) => document.status === 'ACTIVE');

  if (activeDocuments.length === 0) {
    throw new AppError('Upload at least one document before submitting the application', 400);
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: ApplicationStatus.SUBMITTED,
    },
    include: applicationInclude,
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'APPLICATION_SUBMITTED',
    entityType: 'Application',
    entityId: updated.id,
    metadata: { status: updated.status },
  });

  return updated;
}

export async function listApplicationRequests(user: AuthUser, applicationId: string) {
  await assertCanAccessApplication(user, applicationId);

  return prisma.documentRequest.findMany({
    where: { applicationId },
    include: {
      documentType: {
        select: { id: true, code: true, name: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
