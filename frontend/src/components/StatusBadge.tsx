import type { ApplicationStatus, DocumentRequestStatus, DocumentStatus } from '../types/applications';

const applicationLabels: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  NEEDS_INFORMATION: 'Needs information',
  COMPLETED: 'Completed',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {applicationLabels[status]}
    </span>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`status-badge status-badge--doc-${status.toLowerCase()}`}>
      {status === 'ACTIVE' ? 'Active' : 'Replaced'}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: DocumentRequestStatus }) {
  return (
    <span className={`status-badge status-badge--req-${status.toLowerCase()}`}>
      {status === 'OPEN' ? 'Open' : 'Resolved'}
    </span>
  );
}
