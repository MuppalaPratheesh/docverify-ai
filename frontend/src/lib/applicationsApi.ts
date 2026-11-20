import { getApiBaseUrl } from '../config/env';
import { apiRequest, ApiError } from './api';
import type {
  ApplicationDetail,
  ApplicationSummary,
  DocumentRequestItem,
  DocumentTypeSummary,
  ApplicationDocument,
} from '../types/applications';

type ListApplicationsResponse = {
  success: true;
  data: { applications: ApplicationSummary[] };
};

type ApplicationResponse = {
  success: true;
  data: { application: ApplicationDetail };
};

type DocumentTypesResponse = {
  success: true;
  data: { documentTypes: DocumentTypeSummary[] };
};

type DocumentResponse = {
  success: true;
  data: { document: ApplicationDocument };
};

type RequestsResponse = {
  success: true;
  data: { requests: DocumentRequestItem[] };
};

export function listApplications() {
  return apiRequest<ListApplicationsResponse>('/applications');
}

export function getApplication(id: string) {
  return apiRequest<ApplicationResponse>(`/applications/${id}`);
}

export function createApplication(notes?: string) {
  return apiRequest<ApplicationResponse>('/applications', {
    method: 'POST',
    body: notes ? { notes } : {},
  });
}

export function updateApplicationNotes(id: string, notes: string) {
  return apiRequest<ApplicationResponse>(`/applications/${id}`, {
    method: 'PATCH',
    body: { notes },
  });
}

export function submitApplication(id: string) {
  return apiRequest<ApplicationResponse>(`/applications/${id}/submit`, {
    method: 'POST',
  });
}

export function listDocumentTypes() {
  return apiRequest<DocumentTypesResponse>('/document-types');
}

export function listApplicationRequests(id: string) {
  return apiRequest<RequestsResponse>(`/applications/${id}/requests`);
}

export function getDocumentDownloadUrl(documentId: string): string {
  return `${getApiBaseUrl()}/documents/${documentId}/download`;
}

export function uploadApplicationDocument(
  applicationId: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<DocumentResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiBaseUrl()}/applications/${applicationId}/documents`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as DocumentResponse);
        return;
      }

      const message =
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        (payload as { error?: { message?: string } }).error?.message
          ? String((payload as { error: { message: string } }).error.message)
          : `Upload failed with status ${xhr.status}`;

      reject(new ApiError(message, xhr.status));
    };

    xhr.onerror = () => reject(new ApiError('Network error during upload', 0));
    xhr.send(formData);
  });
}

export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const response = await fetch(getDocumentDownloadUrl(documentId), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError('Unable to download document', response.status);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
