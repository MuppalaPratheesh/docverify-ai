import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationStatusBadge } from '../components/StatusBadge';
import { ApiError } from '../lib/api';
import { listApplications } from '../lib/applicationsApi';
import type { ApplicationSummary } from '../types/applications';
import { formatDateTime } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

export function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listApplications();
        if (!cancelled) {
          setApplications(response.data.applications);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load applications');
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

  return (
    <section className="panel" aria-labelledby="applications-heading">
      <div className="panel-header">
        <div>
          <p className="panel__eyebrow">Applications</p>
          <h2 id="applications-heading">Your applications</h2>
          <p>Track drafts, submissions and reviewer document requests.</p>
        </div>
        {user?.role === 'APPLICANT' || user?.role === 'ADMIN' ? (
          <Link className="btn" to="/applications/new">
            New application
          </Link>
        ) : null}
      </div>

      {loading ? <p className="muted">Loading applications…</p> : null}
      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && !error && applications.length === 0 ? (
        <div className="empty-state">
          <h3>No applications yet</h3>
          <p>Create a draft application, upload synthetic documents, then submit for review.</p>
          {(user?.role === 'APPLICANT' || user?.role === 'ADMIN') && (
            <Link className="btn" to="/applications/new">
              Create application
            </Link>
          )}
        </div>
      ) : null}

      {!loading && applications.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Number</th>
                <th scope="col">Status</th>
                <th scope="col">Documents</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <Link to={`/applications/${application.id}`}>
                      {application.applicationNumber}
                    </Link>
                  </td>
                  <td>
                    <ApplicationStatusBadge status={application.status} />
                  </td>
                  <td>{application._count?.documents ?? application.documents?.length ?? 0}</td>
                  <td>{formatDateTime(application.updatedAt)}</td>
                  <td>
                    <Link className="text-link" to={`/applications/${application.id}`}>
                      Open
                    </Link>
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
