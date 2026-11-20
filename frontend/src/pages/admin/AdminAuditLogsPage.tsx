import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { listAdminAuditLogs } from '../../lib/adminApi';
import type { AdminAuditLog } from '../../types/admin';
import { formatDateTime } from '../../utils/format';

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listAdminAuditLogs({
          q: search || undefined,
          limit: 150,
        });
        if (!cancelled) setLogs(response.data.auditLogs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load audit logs');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="panel__eyebrow">Administration</p>
          <h2>Audit logs</h2>
          <p>Administrative and security-relevant events. Password values are never stored here.</p>
        </div>
        <Link className="btn btn--secondary" to="/admin/dashboard">
          Dashboard
        </Link>
      </div>

      <form
        className="filter-bar"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setSearch(q.trim());
        }}
      >
        <div className="form-field">
          <label htmlFor="audit-search">Search</label>
          <input
            id="audit-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Action, entity, actor email"
          />
        </div>
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <p className="muted">Loading audit logs…</p> : null}

      {!loading && logs.length === 0 ? (
        <div className="empty-state">
          <h3>No audit entries</h3>
          <p>Administrative actions will appear here.</p>
        </div>
      ) : null}

      {!loading && logs.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>
                    {log.actor ? (
                      <>
                        <div>{log.actor.name}</div>
                        <div className="muted">{log.actor.email}</div>
                      </>
                    ) : (
                      <span className="muted">System</span>
                    )}
                  </td>
                  <td>{log.action}</td>
                  <td>
                    {log.entityType}
                    <div className="muted">{log.entityId}</div>
                  </td>
                  <td>
                    <code className="meta-code">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
