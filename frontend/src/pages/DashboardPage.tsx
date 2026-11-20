import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationStatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { listApplications } from '../lib/applicationsApi';
import type { ApplicationSummary } from '../types/applications';
import { formatDateTime } from '../utils/format';
import { getApiBaseUrl } from '../config/env';

export function DashboardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [appsResponse, healthResponse] = await Promise.all([
          listApplications(),
          fetch(`${getApiBaseUrl()}/health`, { credentials: 'include' }),
        ]);

        if (!cancelled) {
          setApplications(appsResponse.data.applications);
          setApiHealthy(healthResponse.ok);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load dashboard');
          setApiHealthy(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const byStatus = {
      DRAFT: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      NEEDS_INFORMATION: 0,
      COMPLETED: 0,
    };

    for (const application of applications) {
      byStatus[application.status] += 1;
    }

    return {
      total: applications.length,
      ...byStatus,
    };
  }, [applications]);

  const recent = applications.slice(0, 5);

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="dashboard-heading">
        <p className="panel__eyebrow">Dashboard</p>
        <h2 id="dashboard-heading">Welcome{user ? `, ${user.name}` : ''}</h2>
        <p>
          Signed in as <strong>{user?.role}</strong>. Manage academic document applications and
          uploads from this workspace.
        </p>

        <div className="status-grid">
          <div className="status-card">
            <strong>Total applications</strong>
            <span>{loading ? '…' : stats.total}</span>
          </div>
          <div className="status-card">
            <strong>Drafts</strong>
            <span>{loading ? '…' : stats.DRAFT}</span>
          </div>
          <div className="status-card">
            <strong>Needs information</strong>
            <span>{loading ? '…' : stats.NEEDS_INFORMATION}</span>
          </div>
          <div className="status-card">
            <strong>API</strong>
            <span>
              {apiHealthy === null ? 'Checking…' : apiHealthy ? 'Healthy' : 'Unavailable'}
            </span>
          </div>
        </div>

        {(user?.role === 'APPLICANT' || user?.role === 'ADMIN') && (
          <div className="button-row">
            <Link className="btn" to="/applications/new">
              New application
            </Link>
            <Link className="btn btn--secondary" to="/applications">
              View applications
            </Link>
          </div>
        )}

        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Recent applications</h3>
          <Link className="text-link" to="/applications">
            View all
          </Link>
        </div>

        {loading ? <p className="muted">Loading…</p> : null}

        {!loading && recent.length === 0 ? (
          <div className="empty-state">
            <h3>No applications yet</h3>
            <p>Create a draft and upload synthetic PDF/JPG/PNG documents to get started.</p>
          </div>
        ) : null}

        {!loading && recent.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <Link to={`/applications/${application.id}`}>
                        {application.applicationNumber}
                      </Link>
                    </td>
                    <td>
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td>{formatDateTime(application.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
