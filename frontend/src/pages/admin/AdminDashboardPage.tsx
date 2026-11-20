import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { getAdminDashboard } from '../../lib/adminApi';
import type { AdminDashboardData } from '../../types/admin';

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getAdminDashboard();
        if (!cancelled) setData(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load admin dashboard');
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

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="admin-dashboard-heading">
        <p className="panel__eyebrow">Administration</p>
        <h2 id="admin-dashboard-heading">Platform overview</h2>
        <p>
          Manage users, document types, verification rules and reference metadata. No AI/RAG
          features are enabled in this Phase 2 panel.
        </p>

        <div className="status-grid">
          <div className="status-card">
            <strong>Users</strong>
            <span>{loading ? '…' : (data?.users.total ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Applications</strong>
            <span>{loading ? '…' : (data?.applications.total ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Under review</strong>
            <span>{loading ? '…' : (data?.applications.UNDER_REVIEW ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Needs information</strong>
            <span>{loading ? '…' : (data?.applications.NEEDS_INFORMATION ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Completed</strong>
            <span>{loading ? '…' : (data?.applications.COMPLETED ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Open requests</strong>
            <span>{loading ? '…' : (data?.openDocumentRequests ?? 0)}</span>
          </div>
        </div>

        <div className="button-row">
          <Link className="btn" to="/admin/users">
            Users
          </Link>
          <Link className="btn btn--secondary" to="/admin/document-types">
            Document types
          </Link>
          <Link className="btn btn--secondary" to="/admin/verification-rules">
            Verification rules
          </Link>
          <Link className="btn btn--secondary" to="/admin/reference-sources">
            Reference sources
          </Link>
          <Link className="btn btn--secondary" to="/admin/audit-logs">
            Audit logs
          </Link>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h3>Users by role</h3>
        <div className="status-grid">
          <div className="status-card">
            <strong>Applicants</strong>
            <span>{loading ? '…' : (data?.users.byRole.APPLICANT ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Reviewers</strong>
            <span>{loading ? '…' : (data?.users.byRole.REVIEWER ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Admins</strong>
            <span>{loading ? '…' : (data?.users.byRole.ADMIN ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Catalog size</strong>
            <span>
              {loading
                ? '…'
                : `${data?.documentTypes ?? 0} types · ${data?.verificationRules ?? 0} rules · ${data?.referenceSources ?? 0} sources`}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
