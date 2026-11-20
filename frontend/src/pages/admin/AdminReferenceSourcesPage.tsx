import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import {
  createAdminReferenceSource,
  listAdminReferenceSources,
  updateAdminReferenceSource,
} from '../../lib/adminApi';
import type { AdminReferenceSource } from '../../types/admin';
import { formatDateTime } from '../../utils/format';

export function AdminReferenceSourcesPage() {
  const [sources, setSources] = useState<AdminReferenceSource[]>([]);
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const response = await listAdminReferenceSources();
    setSources(response.data.sources);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load reference sources');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createAdminReferenceSource({
        title: title.trim(),
        version: version.trim(),
        effectiveDate: new Date(effectiveDate).toISOString(),
        sourceDescription: sourceDescription.trim() || undefined,
      });
      setTitle('');
      setVersion('');
      setEffectiveDate('');
      setSourceDescription('');
      setMessage('Reference source created.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create reference source');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateAdminReferenceSource(id, {
        title: editTitle.trim(),
        version: editVersion.trim(),
        sourceDescription: editDescription.trim() || null,
      });
      setEditingId(null);
      setMessage('Reference source updated.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update reference source');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel__eyebrow">Administration</p>
            <h2>Reference sources</h2>
            <p>Maintain metadata for verification reference materials. No vector search yet.</p>
          </div>
          <Link className="btn btn--secondary" to="/admin/dashboard">
            Dashboard
          </Link>
        </div>

        {message ? <div className="alert alert--success">{message}</div> : null}
        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <form className="form-grid form-grid--wide" onSubmit={(event) => void onCreate(event)}>
          <h3>Add reference source</h3>
          <div className="form-field">
            <label htmlFor="src-title">Title</label>
            <input
              id="src-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="src-version">Version</label>
            <input
              id="src-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="src-date">Effective date</label>
            <input
              id="src-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="src-description">Description</label>
            <textarea
              id="src-description"
              rows={3}
              value={sourceDescription}
              onChange={(e) => setSourceDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="btn" disabled={busy}>
            Create
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Existing sources</h3>
        {loading ? <p className="muted">Loading…</p> : null}
        <div className="card-grid">
          {sources.map((source) => (
            <article key={source.id} className="doc-card">
              <strong>
                {source.title} <span className="muted">v{source.version}</span>
              </strong>
              <p className="muted">Effective {formatDateTime(source.effectiveDate)}</p>
              {editingId === source.id ? (
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={`edit-src-title-${source.id}`}>Title</label>
                    <input
                      id={`edit-src-title-${source.id}`}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`edit-src-version-${source.id}`}>Version</label>
                    <input
                      id={`edit-src-version-${source.id}`}
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`edit-src-desc-${source.id}`}>Description</label>
                    <textarea
                      id={`edit-src-desc-${source.id}`}
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => void onSaveEdit(source.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{source.sourceDescription || 'No description'}</p>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(source.id);
                      setEditTitle(source.title);
                      setEditVersion(source.version);
                      setEditDescription(source.sourceDescription ?? '');
                    }}
                  >
                    Edit
                  </button>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
