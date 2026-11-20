import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationStatusBadge } from '../../components/StatusBadge';
import { ApiError } from '../../lib/api';
import { listReviewerApplications } from '../../lib/reviewerApi';
import type { ReviewerApplicationSummary } from '../../types/reviewer';
import { formatDateTime } from '../../utils/format';

const STATUS_FILTERS = [
  { value: '', label: 'All non-draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'NEEDS_INFORMATION', label: 'Needs information' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

export function ReviewerApplicationsPage() {
  const [applications, setApplications] = useState<ReviewerApplicationSummary[]>([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listReviewerApplications({
          status: status || undefined,
          q: query || undefined,
        });
        if (!cancelled) {
          setApplications(response.data.applications);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load review queue');
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
  }, [status, query]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  return (
    <section className="panel" aria-labelledby="reviewer-queue-heading">
      <div className="panel-header">
        <div>
          <p className="panel__eyebrow">Review queue</p>
          <h2 id="reviewer-queue-heading">Submitted applications</h2>
          <p>Filter by status or search by applicant name and application number.</p>
        </div>
        <Link className="btn btn--secondary" to="/reviewer/dashboard">
          Dashboard
        </Link>
      </div>

      <form className="filter-bar" onSubmit={onSearch}>
        <div className="form-field">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="search-filter">Search</label>
          <input
            id="search-filter"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Applicant name or application number"
          />
        </div>
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {loading ? <p className="muted">Loading applications…</p> : null}
      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && applications.length === 0 ? (
        <div className="empty-state">
          <h3>No applications match</h3>
          <p>Try clearing filters or wait for applicants to submit drafts.</p>
        </div>
      ) : null}

      {!loading && applications.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Number</th>
                <th scope="col">Applicant</th>
                <th scope="col">Status</th>
                <th scope="col">Documents</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>{application.applicationNumber}</td>
                  <td>
                    <div>{application.applicant.name}</div>
                    <div className="muted">{application.applicant.email}</div>
                  </td>
                  <td>
                    <ApplicationStatusBadge status={application.status} />
                  </td>
                  <td>{application._count?.documents ?? application.documents.length}</td>
                  <td>{formatDateTime(application.updatedAt)}</td>
                  <td>
                    <Link className="text-link" to={`/reviewer/applications/${application.id}`}>
                      Review
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
