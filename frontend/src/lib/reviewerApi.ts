import { apiRequest } from './api';
import type {
  ReviewDecision,
  ReviewerApplicationDetail,
  ReviewerApplicationSummary,
  ReviewerDashboardData,
  ReviewActionItem,
} from '../types/reviewer';
import type { DocumentRequestItem } from '../types/applications';

type DashboardResponse = {
  success: true;
  data: ReviewerDashboardData;
};

type ListResponse = {
  success: true;
  data: { applications: ReviewerApplicationSummary[] };
};

type DetailResponse = {
  success: true;
  data: { application: ReviewerApplicationDetail };
};

type DecisionResponse = {
  success: true;
  data: {
    reviewAction: ReviewActionItem;
    application: ReviewerApplicationDetail;
  };
};

type RequestResponse = {
  success: true;
  data: {
    request: DocumentRequestItem;
    application: ReviewerApplicationDetail;
  };
};

export function getReviewerDashboard() {
  return apiRequest<DashboardResponse>('/reviewer/dashboard');
}

export function listReviewerApplications(params?: { status?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set('status', params.status);
  }
  if (params?.q) {
    search.set('q', params.q);
  }
  const query = search.toString();
  return apiRequest<ListResponse>(`/reviewer/applications${query ? `?${query}` : ''}`);
}

export function getReviewerApplication(id: string) {
  return apiRequest<DetailResponse>(`/reviewer/applications/${id}`);
}

export function updateReviewerNotes(id: string, reviewerNotes: string | null) {
  return apiRequest<DetailResponse>(`/reviewer/applications/${id}/notes`, {
    method: 'PATCH',
    body: { reviewerNotes },
  });
}

export function recordReviewDecision(
  id: string,
  payload: { decision: ReviewDecision; comment?: string },
) {
  return apiRequest<DecisionResponse>(`/reviewer/applications/${id}/decisions`, {
    method: 'POST',
    body: payload,
  });
}

export function createReviewerDocumentRequest(
  id: string,
  payload: { documentTypeId: string; message: string },
) {
  return apiRequest<RequestResponse>(`/reviewer/applications/${id}/requests`, {
    method: 'POST',
    body: payload,
  });
}
