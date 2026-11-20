import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationStatusBadge } from '../../components/StatusBadge';
import { ApiError } from '../../lib/api';
import { getReviewerDashboard } from '../../lib/reviewerApi';
import type { ReviewerDashboardData } from '../../types/reviewer';
import { formatDateTime } from '../../utils/format';

export function ReviewerDashboardPage() {
  const [data, setData] = useState<ReviewerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getReviewerDashboard();
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load reviewer dashboard');
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
    <div className="stack">
      <section className="panel" aria-labelledby="reviewer-dashboard-heading">
        <p className="panel__eyebrow">Reviewer workspace</p>
        <h2 id="reviewer-dashboard-heading">Manual review dashboard</h2>
        <p>
          Review submitted academic documents manually. This Phase 2 workspace does not perform AI
          verification or tampering detection.
        </p>

        <div className="status-grid">
          <div className="status-card">
            <strong>Queue total</strong>
            <span>{loading ? '…' : (data?.counts.total ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Submitted</strong>
            <span>{loading ? '…' : (data?.counts.SUBMITTED ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Under review</strong>
            <span>{loading ? '…' : (data?.counts.UNDER_REVIEW ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Needs information</strong>
            <span>{loading ? '…' : (data?.counts.NEEDS_INFORMATION ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Open document requests</strong>
            <span>{loading ? '…' : (data?.openRequests ?? 0)}</span>
          </div>
          <div className="status-card">
            <strong>Completed</strong>
            <span>{loading ? '…' : (data?.counts.COMPLETED ?? 0)}</span>
          </div>
        </div>

        <div className="button-row">
          <Link className="btn" to="/reviewer/applications">
            Open review queue
          </Link>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h3>Recent decisions</h3>
        {loading ? <p className="muted">Loading…</p> : null}
        {!loading && (data?.recentDecisions.length ?? 0) === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>No review decisions recorded yet.</p>
          </div>
        ) : null}
        {!loading && data && data.recentDecisions.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Application</th>
                  <th scope="col">Applicant</th>
                  <th scope="col">Decision</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentDecisions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/reviewer/applications/${item.application.id}`}>
                        {item.application.applicationNumber}
                      </Link>
                    </td>
                    <td>{item.application.applicant.name}</td>
                    <td>
                      <ApplicationStatusBadge status={item.application.status} />
                      <span className="muted"> · {item.decision}</span>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
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
