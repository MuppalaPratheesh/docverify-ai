import { apiRequest } from './api';
import type { UserRole } from '../types/auth';
import type {
  AdminAuditLog,
  AdminDashboardData,
  AdminDocumentType,
  AdminReferenceSource,
  AdminUser,
  AdminVerificationRule,
} from '../types/admin';

export function getAdminDashboard() {
  return apiRequest<{ success: true; data: AdminDashboardData }>('/admin/dashboard');
}

export function listAdminUsers(params?: { q?: string; role?: UserRole }) {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.role) search.set('role', params.role);
  const query = search.toString();
  return apiRequest<{ success: true; data: { users: AdminUser[] } }>(
    `/admin/users${query ? `?${query}` : ''}`,
  );
}

export function changeAdminUserRole(userId: string, role: UserRole) {
  return apiRequest<{ success: true; data: { user: AdminUser } }>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role },
  });
}

export function listAdminDocumentTypes() {
  return apiRequest<{ success: true; data: { documentTypes: AdminDocumentType[] } }>(
    '/admin/document-types',
  );
}

export function createAdminDocumentType(payload: {
  name: string;
  code: string;
  description?: string;
  active?: boolean;
}) {
  return apiRequest<{ success: true; data: { documentType: AdminDocumentType } }>(
    '/admin/document-types',
    { method: 'POST', body: payload },
  );
}

export function updateAdminDocumentType(
  id: string,
  payload: { name?: string; description?: string | null; active?: boolean },
) {
  return apiRequest<{ success: true; data: { documentType: AdminDocumentType } }>(
    `/admin/document-types/${id}`,
    { method: 'PATCH', body: payload },
  );
}

export function listAdminVerificationRules() {
  return apiRequest<{ success: true; data: { rules: AdminVerificationRule[] } }>(
    '/admin/verification-rules',
  );
}

export function createAdminVerificationRule(payload: {
  title: string;
  description?: string;
  documentTypeId: string;
  isActive?: boolean;
  effectiveDate: string;
}) {
  return apiRequest<{ success: true; data: { rule: AdminVerificationRule } }>(
    '/admin/verification-rules',
    { method: 'POST', body: payload },
  );
}

export function updateAdminVerificationRule(
  id: string,
  payload: {
    title?: string;
    description?: string | null;
    documentTypeId?: string;
    isActive?: boolean;
    effectiveDate?: string;
  },
) {
  return apiRequest<{ success: true; data: { rule: AdminVerificationRule } }>(
    `/admin/verification-rules/${id}`,
    { method: 'PATCH', body: payload },
  );
}

export function listAdminReferenceSources() {
  return apiRequest<{ success: true; data: { sources: AdminReferenceSource[] } }>(
    '/admin/reference-sources',
  );
}

export function createAdminReferenceSource(payload: {
  title: string;
  version: string;
  effectiveDate: string;
  sourceDescription?: string;
}) {
  return apiRequest<{ success: true; data: { source: AdminReferenceSource } }>(
    '/admin/reference-sources',
    { method: 'POST', body: payload },
  );
}

export function updateAdminReferenceSource(
  id: string,
  payload: {
    title?: string;
    version?: string;
    effectiveDate?: string;
    sourceDescription?: string | null;
  },
) {
  return apiRequest<{ success: true; data: { source: AdminReferenceSource } }>(
    `/admin/reference-sources/${id}`,
    { method: 'PATCH', body: payload },
  );
}

export function listAdminAuditLogs(params?: {
  q?: string;
  action?: string;
  entityType?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.action) search.set('action', params.action);
  if (params?.entityType) search.set('entityType', params.entityType);
  if (params?.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return apiRequest<{ success: true; data: { auditLogs: AdminAuditLog[] } }>(
    `/admin/audit-logs${query ? `?${query}` : ''}`,
  );
}
