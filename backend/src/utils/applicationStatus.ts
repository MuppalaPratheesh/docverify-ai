import { ApplicationStatus, ReviewDecision } from '@prisma/client';

/**
 * Map a review decision to the resulting application status.
 */
export function nextStatusForDecision(decision: ReviewDecision): ApplicationStatus {
  switch (decision) {
    case ReviewDecision.APPROVED:
    case ReviewDecision.REJECTED:
      return ApplicationStatus.COMPLETED;
    case ReviewDecision.NEEDS_INFORMATION:
      return ApplicationStatus.NEEDS_INFORMATION;
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

export function canEditApplicationNotes(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.DRAFT;
}

export function canSubmitApplication(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.DRAFT;
}

export function canUploadDocuments(status: ApplicationStatus): boolean {
  return (
    status === ApplicationStatus.DRAFT || status === ApplicationStatus.NEEDS_INFORMATION
  );
}

export function canRecordReviewDecision(status: ApplicationStatus): boolean {
  return (
    status !== ApplicationStatus.DRAFT && status !== ApplicationStatus.COMPLETED
  );
}

export function canRequestAdditionalDocuments(status: ApplicationStatus): boolean {
  return (
    status !== ApplicationStatus.DRAFT && status !== ApplicationStatus.COMPLETED
  );
}

/** Valid transition when a reviewer opens a submitted application. */
export function transitionOnReviewerOpen(
  status: ApplicationStatus,
): ApplicationStatus {
  if (status === ApplicationStatus.SUBMITTED) {
    return ApplicationStatus.UNDER_REVIEW;
  }

  return status;
}
