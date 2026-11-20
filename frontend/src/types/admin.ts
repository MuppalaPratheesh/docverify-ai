import type { UserRole } from './auth';
import type { ApplicationStatus } from './applications';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  _count?: {
    applications: number;
    reviewActions: number;
  };
};

export type AdminDocumentType = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  _count?: {
    documents: number;
    verificationRules: number;
  };
};

export type AdminVerificationRule = {
  id: string;
  title: string;
  description?: string | null;
  documentTypeId: string;
  isActive: boolean;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  documentType: {
    id: string;
    code: string;
    name: string;
    active: boolean;
  };
};

export type AdminReferenceSource = {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  sourceDescription?: string | null;
  createdAt: string;
};

export type AdminAuditLog = {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
};

export type AdminDashboardData = {
  users: {
    total: number;
    byRole: Record<UserRole, number>;
  };
  applications: Record<ApplicationStatus | 'total', number>;
  documentTypes: number;
  verificationRules: number;
  referenceSources: number;
  openDocumentRequests: number;
};
