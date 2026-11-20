import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApplicationStatusBadge,
  DocumentStatusBadge,
  RequestStatusBadge,
} from '../components/StatusBadge';
import { ApiError } from '../lib/api';
import {
  downloadDocument,
  getApplication,
  listDocumentTypes,
  submitApplication,
  updateApplicationNotes,
  uploadApplicationDocument,
} from '../lib/applicationsApi';
import type {
  ApplicationDetail,
  DocumentTypeSummary,
} from '../types/applications';
import { formatBytes, formatDateTime } from '../utils/format';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export function ApplicationDetailPage() {
  const { id = '' } = useParams();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSummary[]>([]);
  const [notes, setNotes] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [replaceDocumentId, setReplaceDocumentId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEditNotes = application?.status === 'DRAFT';
  const canUpload =
    application?.status === 'DRAFT' || application?.status === 'NEEDS_INFORMATION';
  const canSubmit = application?.status === 'DRAFT';

  const activeDocuments = useMemo(
    () => application?.documents.filter((document) => document.status === 'ACTIVE') ?? [],
    [application],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [applicationResponse, typesResponse] = await Promise.all([
        getApplication(id),
        listDocumentTypes(),
      ]);
      setApplication(applicationResponse.data.application);
      setNotes(applicationResponse.data.application.notes ?? '');
      setDocumentTypes(typesResponse.data.documentTypes);
      setDocumentTypeId((current) => current || typesResponse.data.documentTypes[0]?.id || '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load application');
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveNotes(event: FormEvent) {
    event.preventDefault();
    if (!application) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await updateApplicationNotes(application.id, notes);
      setApplication(response.data.application);
      setMessage('Notes saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save notes');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!application) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await submitApplication(application.id);
      setApplication(response.data.application);
      setMessage('Application submitted successfully.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit application');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!application || !selectedFile) {
      setError('Choose a PDF, JPG or PNG file to upload.');
      return;
    }

    if (selectedFile.size > MAX_FILE_BYTES) {
      setError('File exceeds the 10 MB limit.');
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      setError('Only PDF, JPG and PNG files are allowed.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentTypeId', documentTypeId);
      if (replaceDocumentId) {
        formData.append('replaceDocumentId', replaceDocumentId);
      }

      await uploadApplicationDocument(application.id, formData, setUploadProgress);
      setSelectedFile(null);
      setReplaceDocumentId('');
      setUploadProgress(null);
      setMessage(replaceDocumentId ? 'Replacement document uploaded.' : 'Document uploaded.');
      await load();
    } catch (err) {
      setUploadProgress(null);
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Loading application…</p>
      </section>
    );
  }

  if (!application) {
    return (
      <section className="panel">
        <div className="alert alert--error" role="alert">
          {error ?? 'Application not found'}
        </div>
        <Link className="text-link" to="/applications">
          Back to applications
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="application-detail-heading">
        <div className="panel-header">
          <div>
            <p className="panel__eyebrow">Application</p>
            <h2 id="application-detail-heading">{application.applicationNumber}</h2>
            <p>Created {formatDateTime(application.createdAt)}</p>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>

        {message ? (
          <div className="alert alert--success" role="status">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="button-row">
          <Link className="btn btn--secondary" to="/applications">
            Back to list
          </Link>
          {canSubmit ? (
            <button type="button" className="btn" disabled={busy} onClick={() => void handleSubmit()}>
              Submit application
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h3>Notes</h3>
        {canEditNotes ? (
          <form className="form-grid form-grid--wide" onSubmit={(event) => void handleSaveNotes(event)}>
            <div className="form-field">
              <label htmlFor="detail-notes">Application notes</label>
              <textarea
                id="detail-notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <button type="submit" className="btn" disabled={busy}>
              Save notes
            </button>
          </form>
        ) : (
          <p>{application.notes?.trim() ? application.notes : 'No notes provided.'}</p>
        )}
      </section>

      <section className="panel">
        <h3>Documents</h3>
        {application.documents.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No documents uploaded yet. Add at least one before submitting.</p>
          </div>
        ) : (
          <div className="card-grid">
            {application.documents.map((document) => (
              <article key={document.id} className="doc-card">
                <div className="doc-card__header">
                  <strong>{document.documentType.name}</strong>
                  <DocumentStatusBadge status={document.status} />
                </div>
                <p className="doc-card__name">{document.originalFilename}</p>
                <p className="muted">
                  {document.mimeType} · {formatBytes(document.fileSize)}
                </p>
                <p className="muted">Uploaded {formatDateTime(document.uploadedAt)}</p>
                {document.supersededDocumentId ? (
                  <p className="muted">Replaces previous document version</p>
                ) : null}
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() =>
                    void downloadDocument(document.id, document.originalFilename).catch((err) =>
                      setError(err instanceof ApiError ? err.message : 'Download failed'),
                    )
                  }
                >
                  Download
                </button>
              </article>
            ))}
          </div>
        )}

        {canUpload ? (
          <form className="form-grid form-grid--wide upload-form" onSubmit={(event) => void handleUpload(event)}>
            <h4>Upload document</h4>
            <p className="field-hint">
              Allowed: PDF, JPG, PNG · Max size: 10 MB · Synthetic/anonymized files only
            </p>

            <div className="form-field">
              <label htmlFor="documentTypeId">Document type</label>
              <select
                id="documentTypeId"
                value={documentTypeId}
                onChange={(event) => setDocumentTypeId(event.target.value)}
                required
              >
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="replaceDocumentId">Replace existing document (optional)</label>
              <select
                id="replaceDocumentId"
                value={replaceDocumentId}
                onChange={(event) => setReplaceDocumentId(event.target.value)}
              >
                <option value="">Upload as new document</option>
                {activeDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.documentType.name} — {document.originalFilename}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="file">File</label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                required
              />
              {selectedFile ? (
                <span className="field-hint">
                  Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                </span>
              ) : null}
            </div>

            {uploadProgress !== null ? (
              <div className="progress" aria-label="Upload progress">
                <div className="progress__bar" style={{ width: `${uploadProgress}%` }} />
                <span>{uploadProgress}%</span>
              </div>
            ) : null}

            <button type="submit" className="btn" disabled={busy || !selectedFile}>
              {busy ? 'Uploading…' : replaceDocumentId ? 'Upload replacement' : 'Upload document'}
            </button>
          </form>
        ) : (
          <p className="muted">
            Uploads are available while the application is in Draft or Needs information.
          </p>
        )}
      </section>

      <section className="panel">
        <h3>Reviewer document requests</h3>
        {application.documentRequests.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No document requests from reviewers yet.</p>
          </div>
        ) : (
          <div className="card-grid">
            {application.documentRequests.map((request) => (
              <article key={request.id} className="doc-card">
                <div className="doc-card__header">
                  <strong>{request.documentType.name}</strong>
                  <RequestStatusBadge status={request.status} />
                </div>
                <p>{request.message}</p>
                <p className="muted">
                  From {request.reviewer.name} · {formatDateTime(request.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
