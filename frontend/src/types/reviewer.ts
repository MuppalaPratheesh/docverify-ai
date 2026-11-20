import type {
  ApplicationDetail,
  ApplicationDocument,
  ApplicationStatus,
  DocumentRequestItem,
  DocumentTypeSummary,
} from './applications';

export type ReviewDecision = 'APPROVED' | 'NEEDS_INFORMATION' | 'REJECTED';

export type ReviewActionItem = {
  id: string;
  applicationId: string;
  reviewerId: string;
  decision: ReviewDecision;
  comment?: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
};

export type ReviewerApplicationSummary = {
  id: string;
  applicationNumber: string;
  applicantId: string;
  status: Exclude<ApplicationStatus, 'DRAFT'>;
  notes?: string | null;
  reviewerNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    name: string;
    email: string;
  };
  documents: Array<
    Pick<ApplicationDocument, 'id' | 'status' | 'documentTypeId' | 'originalFilename' | 'mimeType'> & {
      documentType: DocumentTypeSummary;
    }
  >;
  _count?: {
    documents: number;
    documentRequests: number;
    reviewActions: number;
  };
};

export type ReviewerApplicationDetail = Omit<ApplicationDetail, 'documents' | 'documentRequests'> & {
  reviewerNotes?: string | null;
  applicant: {
    id: string;
    name: string;
    email: string;
    createdAt?: string;
  };
  documents: ApplicationDocument[];
  documentRequests: DocumentRequestItem[];
  reviewActions: ReviewActionItem[];
};

export type ReviewerDashboardData = {
  counts: {
    SUBMITTED: number;
    UNDER_REVIEW: number;
    NEEDS_INFORMATION: number;
    COMPLETED: number;
    total: number;
  };
  openRequests: number;
  recentDecisions: Array<
    ReviewActionItem & {
      application: {
        id: string;
        applicationNumber: string;
        status: ApplicationStatus;
        applicant: {
          id: string;
          name: string;
          email: string;
        };
      };
    }
  >;
};
