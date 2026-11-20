export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_INFORMATION'
  | 'COMPLETED';

export type DocumentStatus = 'ACTIVE' | 'REPLACED';

export type DocumentRequestStatus = 'OPEN' | 'RESOLVED';

export type DocumentTypeSummary = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};

export type ApplicationDocument = {
  id: string;
  applicationId: string;
  documentTypeId: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  uploadedAt: string;
  uploadedById: string;
  supersededDocumentId?: string | null;
  documentType: DocumentTypeSummary;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
};

export type DocumentRequestItem = {
  id: string;
  applicationId: string;
  reviewerId: string;
  documentTypeId: string;
  message: string;
  status: DocumentRequestStatus;
  createdAt: string;
  resolvedAt?: string | null;
  documentType: DocumentTypeSummary;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
};

export type ApplicationSummary = {
  id: string;
  applicationNumber: string;
  applicantId: string;
  status: ApplicationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  applicant?: {
    id: string;
    name: string;
    email: string;
  };
  documents?: Array<{ id: string; status: DocumentStatus; documentTypeId: string }>;
  _count?: {
    documents: number;
    documentRequests: number;
  };
};

export type ApplicationDetail = Omit<ApplicationSummary, 'documents'> & {
  documents: ApplicationDocument[];
  documentRequests: DocumentRequestItem[];
};
