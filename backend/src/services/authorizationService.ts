import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/express';

/**
 * Backend ownership checks — never rely on frontend visibility alone.
 */
export async function assertCanAccessApplication(
  user: AuthUser,
  applicationId: string,
): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, applicantId: true },
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.REVIEWER) {
    return;
  }

  if (user.role === UserRole.APPLICANT && application.applicantId === user.id) {
    return;
  }

  throw new AppError('You do not have access to this application', 403);
}

export async function assertCanUploadDocument(
  user: AuthUser,
  applicationId: string,
): Promise<void> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, applicantId: true },
  });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (user.role === UserRole.ADMIN) {
    return;
  }

  if (user.role === UserRole.APPLICANT && application.applicantId === user.id) {
    return;
  }

  throw new AppError('You can only upload documents to your own applications', 403);
}

export function assertCanRecordReview(user: AuthUser): void {
  if (user.role !== UserRole.REVIEWER && user.role !== UserRole.ADMIN) {
    throw new AppError('Only reviewers can record review decisions', 403);
  }
}

export function assertCanManageAdminResources(user: AuthUser): void {
  if (user.role !== UserRole.ADMIN) {
    throw new AppError('Administrator access required', 403);
  }
}

export function applicantOwnsResource(user: AuthUser, ownerId: string): boolean {
  return user.role === UserRole.APPLICANT && user.id === ownerId;
}
