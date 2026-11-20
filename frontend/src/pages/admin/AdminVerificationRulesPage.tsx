import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import {
  createAdminVerificationRule,
  listAdminDocumentTypes,
  listAdminVerificationRules,
  updateAdminVerificationRule,
} from '../../lib/adminApi';
import type { AdminDocumentType, AdminVerificationRule } from '../../types/admin';
import { formatDateTime } from '../../utils/format';

export function AdminVerificationRulesPage() {
  const [rules, setRules] = useState<AdminVerificationRule[]>([]);
  const [documentTypes, setDocumentTypes] = useState<AdminDocumentType[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [rulesResponse, typesResponse] = await Promise.all([
      listAdminVerificationRules(),
      listAdminDocumentTypes(),
    ]);
    setRules(rulesResponse.data.rules);
    setDocumentTypes(typesResponse.data.documentTypes);
    setDocumentTypeId((current) => current || typesResponse.data.documentTypes[0]?.id || '');
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
          setError(err instanceof ApiError ? err.message : 'Unable to load verification rules');
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
      await createAdminVerificationRule({
        title: title.trim(),
        description: description.trim() || undefined,
        documentTypeId,
        effectiveDate: new Date(effectiveDate).toISOString(),
        isActive: true,
      });
      setTitle('');
      setDescription('');
      setEffectiveDate('');
      setMessage('Verification rule created.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create rule');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateAdminVerificationRule(id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      });
      setEditingId(null);
      setMessage('Verification rule updated.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update rule');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(rule: AdminVerificationRule) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateAdminVerificationRule(rule.id, { isActive: !rule.isActive });
      setMessage(`Rule marked ${rule.isActive ? 'inactive' : 'active'}.`);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update rule status');
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
            <h2>Verification rules</h2>
            <p>Basic manual-review rules linked to document types. No AI prompts or RAG.</p>
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
          <h3>Create rule</h3>
          <div className="form-field">
            <label htmlFor="rule-title">Title</label>
            <input
              id="rule-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="rule-type">Document type</label>
            <select
              id="rule-type"
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
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
            <label htmlFor="rule-date">Effective date</label>
            <input
              id="rule-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="rule-description">Description</label>
            <textarea
              id="rule-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="btn" disabled={busy || documentTypes.length === 0}>
            Create rule
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Existing rules</h3>
        {loading ? <p className="muted">Loading…</p> : null}
        <div className="card-grid">
          {rules.map((rule) => (
            <article key={rule.id} className="doc-card">
              <div className="doc-card__header">
                <strong>{rule.title}</strong>
                <span
                  className={`status-badge ${rule.isActive ? 'status-badge--doc-active' : 'status-badge--doc-replaced'}`}
                >
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="muted">
                {rule.documentType.name} · Effective {formatDateTime(rule.effectiveDate)}
              </p>
              {editingId === rule.id ? (
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={`edit-rule-title-${rule.id}`}>Title</label>
                    <input
                      id={`edit-rule-title-${rule.id}`}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`edit-rule-desc-${rule.id}`}>Description</label>
                    <textarea
                      id={`edit-rule-desc-${rule.id}`}
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
                      onClick={() => void onSaveEdit(rule.id)}
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
                  <p>{rule.description || 'No description'}</p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(rule.id);
                        setEditTitle(rule.title);
                        setEditDescription(rule.description ?? '');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={busy}
                      onClick={() => void toggleActive(rule)}
                    >
                      {rule.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
