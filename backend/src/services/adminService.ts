import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/express';
import type {
  AdminUserQuery,
  AuditLogQuery,
  DocumentTypeCreateInput,
  DocumentTypeUpdateInput,
  ReferenceSourceCreateInput,
  ReferenceSourceUpdateInput,
  VerificationRuleCreateInput,
  VerificationRuleUpdateInput,
} from '../validators/adminValidators';
import { writeAuditLog } from './auditService';
import { changeUserRole } from './authService';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

function ensureAdmin(user: AuthUser): void {
  if (user.role !== UserRole.ADMIN) {
    throw new AppError('Administrator access required', 403);
  }
}

function parseDateInput(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date value', 400);
  }
  return date;
}

export async function getAdminDashboard(user: AuthUser) {
  ensureAdmin(user);

  const [userCount, documentTypeCount, ruleCount, sourceCount, applicationGroups, openRequests] =
    await Promise.all([
      prisma.user.count(),
      prisma.documentType.count(),
      prisma.verificationRule.count(),
      prisma.referenceSource.count(),
      prisma.application.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.documentRequest.count({ where: { status: 'OPEN' } }),
    ]);

  const applicationCounts = {
    DRAFT: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    NEEDS_INFORMATION: 0,
    COMPLETED: 0,
    total: 0,
  };

  for (const row of applicationGroups) {
    applicationCounts.total += row._count._all;
    switch (row.status) {
      case 'DRAFT':
        applicationCounts.DRAFT = row._count._all;
        break;
      case 'SUBMITTED':
        applicationCounts.SUBMITTED = row._count._all;
        break;
      case 'UNDER_REVIEW':
        applicationCounts.UNDER_REVIEW = row._count._all;
        break;
      case 'NEEDS_INFORMATION':
        applicationCounts.NEEDS_INFORMATION = row._count._all;
        break;
      case 'COMPLETED':
        applicationCounts.COMPLETED = row._count._all;
        break;
      default:
        break;
    }
  }

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });

  const roleCounts = {
    APPLICANT: 0,
    REVIEWER: 0,
    ADMIN: 0,
  };

  for (const row of usersByRole) {
    roleCounts[row.role] = row._count._all;
  }

  return {
    users: {
      total: userCount,
      byRole: roleCounts,
    },
    applications: applicationCounts,
    documentTypes: documentTypeCount,
    verificationRules: ruleCount,
    referenceSources: sourceCount,
    openDocumentRequests: openRequests,
  };
}

export async function listAdminUsers(user: AuthUser, query: AdminUserQuery) {
  ensureAdmin(user);

  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: {
      ...publicUserSelect,
      _count: {
        select: {
          applications: true,
          reviewActions: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function adminChangeUserRole(
  actor: AuthUser,
  targetUserId: string,
  nextRole: UserRole,
) {
  ensureAdmin(actor);
  return changeUserRole(actor.id, targetUserId, nextRole);
}

export async function listAdminDocumentTypes(user: AuthUser) {
  ensureAdmin(user);

  return prisma.documentType.findMany({
    include: {
      _count: {
        select: {
          documents: true,
          verificationRules: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createDocumentType(user: AuthUser, input: DocumentTypeCreateInput) {
  ensureAdmin(user);

  try {
    const documentType = await prisma.documentType.create({
      data: {
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        active: input.active ?? true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: 'DOCUMENT_TYPE_CREATED',
      entityType: 'DocumentType',
      entityId: documentType.id,
      metadata: { code: documentType.code, name: documentType.name },
    });

    return documentType;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('A document type with this code already exists', 409);
    }
    throw error;
  }
}

export async function updateDocumentType(
  user: AuthUser,
  documentTypeId: string,
  input: DocumentTypeUpdateInput,
) {
  ensureAdmin(user);

  const existing = await prisma.documentType.findUnique({ where: { id: documentTypeId } });
  if (!existing) {
    throw new AppError('Document type not found', 404);
  }

  const documentType = await prisma.documentType.update({
    where: { id: documentTypeId },
    data: {
      name: input.name,
      description: input.description === undefined ? undefined : input.description,
      active: input.active,
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'DOCUMENT_TYPE_UPDATED',
    entityType: 'DocumentType',
    entityId: documentType.id,
    metadata: {
      code: documentType.code,
      changes: input,
    },
  });

  return documentType;
}

export async function listVerificationRules(user: AuthUser) {
  ensureAdmin(user);

  return prisma.verificationRule.findMany({
    include: {
      documentType: {
        select: { id: true, code: true, name: true, active: true },
      },
    },
    orderBy: [{ isActive: 'desc' }, { effectiveDate: 'desc' }],
  });
}

export async function createVerificationRule(user: AuthUser, input: VerificationRuleCreateInput) {
  ensureAdmin(user);

  const documentType = await prisma.documentType.findUnique({
    where: { id: input.documentTypeId },
  });
  if (!documentType) {
    throw new AppError('Document type not found', 404);
  }

  const rule = await prisma.verificationRule.create({
    data: {
      title: input.title,
      description: input.description,
      documentTypeId: input.documentTypeId,
      isActive: input.isActive ?? true,
      effectiveDate: parseDateInput(input.effectiveDate),
    },
    include: {
      documentType: {
        select: { id: true, code: true, name: true, active: true },
      },
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'VERIFICATION_RULE_CREATED',
    entityType: 'VerificationRule',
    entityId: rule.id,
    metadata: { title: rule.title, documentTypeId: rule.documentTypeId },
  });

  return rule;
}

export async function updateVerificationRule(
  user: AuthUser,
  ruleId: string,
  input: VerificationRuleUpdateInput,
) {
  ensureAdmin(user);

  const existing = await prisma.verificationRule.findUnique({ where: { id: ruleId } });
  if (!existing) {
    throw new AppError('Verification rule not found', 404);
  }

  if (input.documentTypeId) {
    const documentType = await prisma.documentType.findUnique({
      where: { id: input.documentTypeId },
    });
    if (!documentType) {
      throw new AppError('Document type not found', 404);
    }
  }

  const rule = await prisma.verificationRule.update({
    where: { id: ruleId },
    data: {
      title: input.title,
      description: input.description === undefined ? undefined : input.description,
      documentTypeId: input.documentTypeId,
      isActive: input.isActive,
      effectiveDate: input.effectiveDate ? parseDateInput(input.effectiveDate) : undefined,
    },
    include: {
      documentType: {
        select: { id: true, code: true, name: true, active: true },
      },
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'VERIFICATION_RULE_UPDATED',
    entityType: 'VerificationRule',
    entityId: rule.id,
    metadata: { changes: input },
  });

  return rule;
}

export async function listReferenceSources(user: AuthUser) {
  ensureAdmin(user);

  return prisma.referenceSource.findMany({
    orderBy: [{ effectiveDate: 'desc' }, { title: 'asc' }],
  });
}

export async function createReferenceSource(user: AuthUser, input: ReferenceSourceCreateInput) {
  ensureAdmin(user);

  try {
    const source = await prisma.referenceSource.create({
      data: {
        title: input.title,
        version: input.version,
        effectiveDate: parseDateInput(input.effectiveDate),
        sourceDescription: input.sourceDescription,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: 'REFERENCE_SOURCE_CREATED',
      entityType: 'ReferenceSource',
      entityId: source.id,
      metadata: { title: source.title, version: source.version },
    });

    return source;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('A reference source with this title and version already exists', 409);
    }
    throw error;
  }
}

export async function updateReferenceSource(
  user: AuthUser,
  sourceId: string,
  input: ReferenceSourceUpdateInput,
) {
  ensureAdmin(user);

  const existing = await prisma.referenceSource.findUnique({ where: { id: sourceId } });
  if (!existing) {
    throw new AppError('Reference source not found', 404);
  }

  try {
    const source = await prisma.referenceSource.update({
      where: { id: sourceId },
      data: {
        title: input.title,
        version: input.version,
        effectiveDate: input.effectiveDate ? parseDateInput(input.effectiveDate) : undefined,
        sourceDescription:
          input.sourceDescription === undefined ? undefined : input.sourceDescription,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: 'REFERENCE_SOURCE_UPDATED',
      entityType: 'ReferenceSource',
      entityId: source.id,
      metadata: { changes: input },
    });

    return source;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('A reference source with this title and version already exists', 409);
    }
    throw error;
  }
}

export async function listAuditLogs(user: AuthUser, query: AuditLogQuery) {
  ensureAdmin(user);

  const where: Prisma.AuditLogWhereInput = {};

  if (query.action) {
    where.action = { contains: query.action, mode: 'insensitive' };
  }

  if (query.entityType) {
    where.entityType = { contains: query.entityType, mode: 'insensitive' };
  }

  if (query.q) {
    where.OR = [
      { action: { contains: query.q, mode: 'insensitive' } },
      { entityType: { contains: query.q, mode: 'insensitive' } },
      { entityId: { contains: query.q, mode: 'insensitive' } },
      { actor: { email: { contains: query.q, mode: 'insensitive' } } },
      { actor: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 100,
  });
}
