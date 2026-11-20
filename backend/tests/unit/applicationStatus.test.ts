import { ApplicationStatus, ReviewDecision } from '@prisma/client';
import {
  canEditApplicationNotes,
  canRecordReviewDecision,
  canRequestAdditionalDocuments,
  canSubmitApplication,
  canUploadDocuments,
  nextStatusForDecision,
  transitionOnReviewerOpen,
} from '../../src/utils/applicationStatus';

describe('Application status transitions', () => {
  it('maps review decisions to the correct next statuses', () => {
    expect(nextStatusForDecision(ReviewDecision.APPROVED)).toBe(ApplicationStatus.COMPLETED);
    expect(nextStatusForDecision(ReviewDecision.REJECTED)).toBe(ApplicationStatus.COMPLETED);
    expect(nextStatusForDecision(ReviewDecision.NEEDS_INFORMATION)).toBe(
      ApplicationStatus.NEEDS_INFORMATION,
    );
  });

  it('only allows note edits and submit from DRAFT', () => {
    expect(canEditApplicationNotes(ApplicationStatus.DRAFT)).toBe(true);
    expect(canSubmitApplication(ApplicationStatus.DRAFT)).toBe(true);

    for (const status of [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.NEEDS_INFORMATION,
      ApplicationStatus.COMPLETED,
    ]) {
      expect(canEditApplicationNotes(status)).toBe(false);
      expect(canSubmitApplication(status)).toBe(false);
    }
  });

  it('allows uploads only in DRAFT and NEEDS_INFORMATION', () => {
    expect(canUploadDocuments(ApplicationStatus.DRAFT)).toBe(true);
    expect(canUploadDocuments(ApplicationStatus.NEEDS_INFORMATION)).toBe(true);
    expect(canUploadDocuments(ApplicationStatus.SUBMITTED)).toBe(false);
    expect(canUploadDocuments(ApplicationStatus.UNDER_REVIEW)).toBe(false);
    expect(canUploadDocuments(ApplicationStatus.COMPLETED)).toBe(false);
  });

  it('blocks review decisions and document requests on DRAFT and COMPLETED', () => {
    expect(canRecordReviewDecision(ApplicationStatus.UNDER_REVIEW)).toBe(true);
    expect(canRecordReviewDecision(ApplicationStatus.SUBMITTED)).toBe(true);
    expect(canRecordReviewDecision(ApplicationStatus.NEEDS_INFORMATION)).toBe(true);
    expect(canRecordReviewDecision(ApplicationStatus.DRAFT)).toBe(false);
    expect(canRecordReviewDecision(ApplicationStatus.COMPLETED)).toBe(false);

    expect(canRequestAdditionalDocuments(ApplicationStatus.UNDER_REVIEW)).toBe(true);
    expect(canRequestAdditionalDocuments(ApplicationStatus.COMPLETED)).toBe(false);
  });

  it('moves SUBMITTED to UNDER_REVIEW when a reviewer opens the application', () => {
    expect(transitionOnReviewerOpen(ApplicationStatus.SUBMITTED)).toBe(
      ApplicationStatus.UNDER_REVIEW,
    );
    expect(transitionOnReviewerOpen(ApplicationStatus.UNDER_REVIEW)).toBe(
      ApplicationStatus.UNDER_REVIEW,
    );
    expect(transitionOnReviewerOpen(ApplicationStatus.NEEDS_INFORMATION)).toBe(
      ApplicationStatus.NEEDS_INFORMATION,
    );
  });
});
