import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ApplicationStatusBadge,
  DocumentStatusBadge,
  RequestStatusBadge,
} from '../../components/StatusBadge';
import { ApiError } from '../../lib/api';
import { downloadDocument, listDocumentTypes } from '../../lib/applicationsApi';
import { getDocumentDownloadUrl } from '../../lib/applicationsApi';
import {
  createReviewerDocumentRequest,
  getReviewerApplication,
  recordReviewDecision,
  updateReviewerNotes,
} from '../../lib/reviewerApi';
import type { DocumentTypeSummary } from '../../types/applications';
import type { ReviewDecision, ReviewerApplicationDetail } from '../../types/reviewer';
import { formatBytes, formatDateTime } from '../../utils/format';

export function ReviewerApplicationDetailPage() {
  const { id = '' } = useParams();
  const [application, setApplication] = useState<ReviewerApplicationDetail | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSummary[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [decision, setDecision] = useState<ReviewDecision>('APPROVED');
  const [decisionComment, setDecisionComment] = useState('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, types] = await Promise.all([
        getReviewerApplication(id),
        listDocumentTypes(),
      ]);
      setApplication(detail.data.application);
      setReviewerNotes(detail.data.application.reviewerNotes ?? '');
      setDocumentTypes(types.data.documentTypes);
      setRequestTypeId((current) => current || types.data.documentTypes[0]?.id || '');
    } catch (err) {
      setApplication(null);
      setError(err instanceof ApiError ? err.message : 'Unable to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const transcriptDocs = useMemo(
    () =>
      application?.documents.filter((doc) => doc.documentType.code === 'TRANSCRIPT') ?? [],
    [application],
  );
  const languageDocs = useMemo(
    () =>
      application?.documents.filter(
        (doc) => doc.documentType.code === 'LANGUAGE_CERTIFICATE',
      ) ?? [],
    [application],
  );
  const otherDocs = useMemo(
    () =>
      application?.documents.filter(
        (doc) =>
          doc.documentType.code !== 'TRANSCRIPT' &&
          doc.documentType.code !== 'LANGUAGE_CERTIFICATE',
      ) ?? [],
    [application],
  );

  const canAct = application && application.status !== 'COMPLETED';

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    if (!application) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await updateReviewerNotes(application.id, reviewerNotes.trim() || null);
      setApplication(response.data.application);
      setMessage('Reviewer notes saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save notes');
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(event: FormEvent) {
    event.preventDefault();
    if (!application) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await recordReviewDecision(application.id, {
        decision,
        comment: decisionComment.trim() || undefined,
      });
      setApplication(response.data.application);
      setDecisionComment('');
      setMessage(`Decision recorded: ${decision}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record decision');
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!application) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await createReviewerDocumentRequest(application.id, {
        documentTypeId: requestTypeId,
        message: requestMessage.trim(),
      });
      setApplication(response.data.application);
      setRequestMessage('');
      setMessage('Document request sent. Application marked as Needs information.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create document request');
    } finally {
      setBusy(false);
    }
  }

  async function openPreview(documentId: string, filename: string) {
    setError(null);
    try {
      const response = await fetch(
        `${getDocumentDownloadUrl(documentId)}?disposition=inline`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        throw new ApiError('Unable to preview document', response.status);
      }
      const blob = await response.blob();
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(blob);
      });
      setPreviewLabel(filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Preview failed');
    }
  }

  function closePreview() {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setPreviewLabel(null);
  }

  function renderDocumentGroup(title: string, docs: ReviewerApplicationDetail['documents']) {
    if (docs.length === 0) {
      return (
        <div className="empty-state empty-state--compact">
          <p>No {title.toLowerCase()} uploaded.</p>
        </div>
      );
    }

    return (
      <div className="card-grid">
        {docs.map((document) => (
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
              <p className="muted">Replacement for a previous version</p>
            ) : null}
            <div className="button-row">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void openPreview(document.id, document.originalFilename)}
              >
                Preview
              </button>
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
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <section className="panel">
        <p className="muted">Loading application for review…</p>
      </section>
    );
  }

  if (!application) {
    return (
      <section className="panel">
        <div className="alert alert--error" role="alert">
          {error ?? 'Application not found'}
        </div>
        <Link className="text-link" to="/reviewer/applications">
          Back to queue
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel__eyebrow">Manual review</p>
            <h2>{application.applicationNumber}</h2>
            <p>
              Applicant <strong>{application.applicant.name}</strong> ·{' '}
              {application.applicant.email}
            </p>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>

        <div className="status-grid">
          <div className="status-card">
            <strong>Applicant</strong>
            <span>{application.applicant.name}</span>
          </div>
          <div className="status-card">
            <strong>Email</strong>
            <span>{application.applicant.email}</span>
          </div>
          <div className="status-card">
            <strong>Submitted/updated</strong>
            <span>{formatDateTime(application.updatedAt)}</span>
          </div>
          <div className="status-card">
            <strong>Applicant notes</strong>
            <span>{application.notes?.trim() || 'None'}</span>
          </div>
        </div>

        <div className="button-row">
          <Link className="btn btn--secondary" to="/reviewer/applications">
            Back to queue
          </Link>
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

        <p className="field-hint">
          Manual review only — no AI verification, authenticity scoring, or tampering detection is
          performed in Phase 2.
        </p>
      </section>

      <section className="panel">
        <h3>Academic transcripts</h3>
        {renderDocumentGroup('Academic transcripts', transcriptDocs)}
      </section>

      <section className="panel">
        <h3>Language certificates</h3>
        {renderDocumentGroup('Language certificates', languageDocs)}
      </section>

      {otherDocs.length > 0 ? (
        <section className="panel">
          <h3>Other documents</h3>
          {renderDocumentGroup('Other documents', otherDocs)}
        </section>
      ) : null}

      {previewUrl ? (
        <section className="panel">
          <div className="panel-header">
            <h3>Document preview{previewLabel ? `: ${previewLabel}` : ''}</h3>
            <button type="button" className="btn btn--secondary" onClick={closePreview}>
              Close preview
            </button>
          </div>
          <iframe title="Document preview" className="preview-frame" src={previewUrl} />
        </section>
      ) : null}

      <section className="panel">
        <h3>Reviewer notes</h3>
        <form className="form-grid form-grid--wide" onSubmit={(event) => void saveNotes(event)}>
          <div className="form-field">
            <label htmlFor="reviewer-notes">Internal notes</label>
            <textarea
              id="reviewer-notes"
              rows={4}
              value={reviewerNotes}
              onChange={(event) => setReviewerNotes(event.target.value)}
              disabled={!canAct || busy}
            />
          </div>
          <button type="submit" className="btn" disabled={!canAct || busy}>
            Save notes
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Record decision</h3>
        <form className="form-grid form-grid--wide" onSubmit={(event) => void submitDecision(event)}>
          <div className="form-field">
            <label htmlFor="decision">Decision</label>
            <select
              id="decision"
              value={decision}
              onChange={(event) => setDecision(event.target.value as ReviewDecision)}
              disabled={!canAct || busy}
              required
            >
              <option value="APPROVED">Approved</option>
              <option value="NEEDS_INFORMATION">Needs information</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="decision-comment">Comment</label>
            <textarea
              id="decision-comment"
              rows={3}
              value={decisionComment}
              onChange={(event) => setDecisionComment(event.target.value)}
              disabled={!canAct || busy}
              placeholder="Explain the manual decision for the audit trail"
            />
          </div>
          <button type="submit" className="btn" disabled={!canAct || busy}>
            Record decision
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Request missing or replacement document</h3>
        <form className="form-grid form-grid--wide" onSubmit={(event) => void submitRequest(event)}>
          <div className="form-field">
            <label htmlFor="request-type">Document type</label>
            <select
              id="request-type"
              value={requestTypeId}
              onChange={(event) => setRequestTypeId(event.target.value)}
              disabled={!canAct || busy}
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
            <label htmlFor="request-message">Explanation</label>
            <textarea
              id="request-message"
              rows={3}
              value={requestMessage}
              onChange={(event) => setRequestMessage(event.target.value)}
              disabled={!canAct || busy}
              required
              minLength={10}
              placeholder="Describe what is missing or why a replacement is required"
            />
          </div>
          <button type="submit" className="btn" disabled={!canAct || busy}>
            Create document request
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Document requests</h3>
        {application.documentRequests.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No document requests yet.</p>
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
                  {request.reviewer.name} · {formatDateTime(request.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Review history</h3>
        {application.reviewActions.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No review decisions recorded yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Decision</th>
                  <th scope="col">Comment</th>
                </tr>
              </thead>
              <tbody>
                {application.reviewActions.map((action) => (
                  <tr key={action.id}>
                    <td>{formatDateTime(action.createdAt)}</td>
                    <td>{action.reviewer.name}</td>
                    <td>{action.decision}</td>
                    <td>{action.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
