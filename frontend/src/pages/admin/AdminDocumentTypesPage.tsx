import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import {
  createAdminDocumentType,
  listAdminDocumentTypes,
  updateAdminDocumentType,
} from '../../lib/adminApi';
import type { AdminDocumentType } from '../../types/admin';

export function AdminDocumentTypesPage() {
  const [items, setItems] = useState<AdminDocumentType[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const response = await listAdminDocumentTypes();
    setItems(response.data.documentTypes);
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
          setError(err instanceof ApiError ? err.message : 'Unable to load document types');
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
      await createAdminDocumentType({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        active: true,
      });
      setName('');
      setCode('');
      setDescription('');
      setMessage('Document type created.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create document type');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateAdminDocumentType(id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setEditingId(null);
      setMessage('Document type updated.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update document type');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: AdminDocumentType) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateAdminDocumentType(item.id, { active: !item.active });
      setMessage(`${item.code} marked ${item.active ? 'inactive' : 'active'}.`);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update status');
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
            <h2>Document types</h2>
            <p>Create academic document categories and activate or deactivate them.</p>
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
          <h3>Create document type</h3>
          <div className="form-field">
            <label htmlFor="dt-name">Name</label>
            <input id="dt-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="dt-code">Code</label>
            <input
              id="dt-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DEGREE_CERTIFICATE"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="dt-description">Description</label>
            <textarea
              id="dt-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="btn" disabled={busy}>
            Create
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Existing types</h3>
        {loading ? <p className="muted">Loading…</p> : null}
        {!loading && items.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No document types yet.</p>
          </div>
        ) : null}
        <div className="card-grid">
          {items.map((item) => (
            <article key={item.id} className="doc-card">
              <div className="doc-card__header">
                <strong>{item.name}</strong>
                <span className={`status-badge ${item.active ? 'status-badge--doc-active' : 'status-badge--doc-replaced'}`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="muted">{item.code}</p>
              {editingId === item.id ? (
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={`edit-name-${item.id}`}>Name</label>
                    <input
                      id={`edit-name-${item.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`edit-desc-${item.id}`}>Description</label>
                    <textarea
                      id={`edit-desc-${item.id}`}
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
                      onClick={() => void onSaveEdit(item.id)}
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
                  <p>{item.description || 'No description'}</p>
                  <p className="muted">
                    {item._count?.documents ?? 0} documents · {item._count?.verificationRules ?? 0}{' '}
                    rules
                  </p>
                  <div className="button-row">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(item.id);
                        setEditName(item.name);
                        setEditDescription(item.description ?? '');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={busy}
                      onClick={() => void toggleActive(item)}
                    >
                      {item.active ? 'Deactivate' : 'Activate'}
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
