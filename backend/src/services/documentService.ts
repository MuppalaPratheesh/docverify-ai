import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApplicationStatus, DocumentRequestStatus, DocumentStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/express';
import type { UploadDocumentFields } from '../validators/applicationValidators';
import {
  extensionForMime,
  resolveSafeStoragePath,
  validateUploadedFile,
} from '../utils/fileValidation';
import { getUploadRoot } from '../utils/storage';
import { writeAuditLog } from './auditService';
import { assertCanAccessApplication, assertCanUploadDocument } from './authorizationService';

const documentInclude = {
  documentType: {
    select: { id: true, code: true, name: true },
  },
  uploadedBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

async function cleanupTempFile(filePath: string | undefined): Promise<void> {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup failures for temp uploads.
  }
}

export async function uploadApplicationDocument(
  user: AuthUser,
  applicationId: string,
  fields: UploadDocumentFields,
  file: Express.Multer.File | undefined,
) {
  if (!file) {
    throw new AppError('A file is required', 400);
  }

  try {
    await assertCanUploadDocument(user, applicationId);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, applicantId: true, status: true },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (user.role === UserRole.APPLICANT && application.applicantId !== user.id) {
      throw new AppError('You can only upload documents to your own applications', 403);
    }

    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.NEEDS_INFORMATION
    ) {
      throw new AppError(
        'Documents can only be uploaded while the application is DRAFT or NEEDS_INFORMATION',
        400,
      );
    }

    const documentType = await prisma.documentType.findFirst({
      where: { id: fields.documentTypeId, active: true },
    });

    if (!documentType) {
      throw new AppError('Document type not found or inactive', 400);
    }

    let replacedDocumentId: string | null = null;

    if (fields.replaceDocumentId) {
      const existing = await prisma.document.findUnique({
        where: { id: fields.replaceDocumentId },
      });

      if (!existing || existing.applicationId !== applicationId) {
        throw new AppError('Document to replace was not found on this application', 404);
      }

      if (existing.status !== DocumentStatus.ACTIVE) {
        throw new AppError('Only active documents can be replaced', 400);
      }

      replacedDocumentId = existing.id;
    }

    const validatedMime = await validateUploadedFile(file.path, file.mimetype);
    const uploadRoot = getUploadRoot();
    const storedFilename = `${randomUUID()}${extensionForMime(validatedMime)}`;
    const finalPath = resolveSafeStoragePath(uploadRoot, storedFilename);

    await fs.rename(file.path, finalPath);

    const document = await prisma.$transaction(async (tx) => {
      if (replacedDocumentId) {
        await tx.document.update({
          where: { id: replacedDocumentId },
          data: { status: DocumentStatus.REPLACED },
        });
      }

      const created = await tx.document.create({
        data: {
          applicationId,
          documentTypeId: documentType.id,
          originalFilename: path.basename(file.originalname).slice(0, 255) || 'upload.bin',
          storedFilename,
          storagePath: storedFilename,
          mimeType: validatedMime,
          fileSize: file.size,
          status: DocumentStatus.ACTIVE,
          uploadedById: user.id,
          supersededDocumentId: replacedDocumentId,
        },
        include: documentInclude,
      });

      // Any matching upload (new or replacement) can resolve an open request.
      await tx.documentRequest.updateMany({
        where: {
          applicationId,
          documentTypeId: documentType.id,
          status: DocumentRequestStatus.OPEN,
        },
        data: {
          status: DocumentRequestStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });

      return created;
    });

    await writeAuditLog({
      actorId: user.id,
      action: replacedDocumentId ? 'DOCUMENT_REPLACED' : 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document.id,
      metadata: {
        applicationId,
        documentTypeId: documentType.id,
        replacedDocumentId,
        mimeType: validatedMime,
        fileSize: file.size,
      },
    });

    return document;
  } catch (error) {
    await cleanupTempFile(file.path);
    throw error;
  }
}

export async function getAuthorizedDocumentFile(user: AuthUser, documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      application: {
        select: { id: true, applicantId: true },
      },
      documentType: {
        select: { code: true, name: true },
      },
    },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  await assertCanAccessApplication(user, document.applicationId);

  if (
    user.role === UserRole.APPLICANT &&
    document.application.applicantId !== user.id
  ) {
    throw new AppError('You do not have access to this document', 403);
  }

  const absolutePath = resolveSafeStoragePath(getUploadRoot(), document.storedFilename);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new AppError('Stored document file is missing', 404);
  }

  return {
    absolutePath,
    document,
  };
}

export async function listActiveDocumentTypes() {
  return prisma.documentType.findMany({
    where: { active: true },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
    },
    orderBy: { name: 'asc' },
  });
}
