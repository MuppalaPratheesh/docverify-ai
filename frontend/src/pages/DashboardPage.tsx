import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBaseUrl } from '../config/env';
import { useAuth } from '../hooks/useAuth';

type HealthResponse = {
  success: boolean;
  data?: {
    status: string;
    service: string;
    environment: string;
    timestamp: string;
    uptimeSeconds: number;
  };
};

export function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          signal: controller.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const payload = (await response.json()) as HealthResponse;
        setHealth(payload);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          err instanceof Error ? err.message : 'Unable to reach the DocVerify AI API';
        setError(message);
        setHealth(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadHealth();

    return () => controller.abort();
  }, [apiBaseUrl]);

  return (
    <section className="panel" aria-labelledby="dashboard-heading">
      <p className="panel__eyebrow">Platform overview</p>
      <h2 id="dashboard-heading">Welcome{user ? `, ${user.name}` : ''}</h2>
      <p>
        You are signed in as <strong>{user?.role}</strong>. Navigation and API access are enforced
        by role on the server, not only in the interface.
      </p>

      <div className="status-grid">
        <div className="status-card">
          <strong>Signed-in user</strong>
          <span>{user?.email ?? '—'}</span>
        </div>
        <div className="status-card">
          <strong>API connectivity</strong>
          <span>
            {loading ? 'Checking…' : error ? 'Unavailable' : health?.data?.status ?? 'Unknown'}
          </span>
        </div>
        <div className="status-card">
          <strong>Environment</strong>
          <span>{health?.data?.environment ?? '—'}</span>
        </div>
      </div>

      {user?.role === 'APPLICANT' ? (
        <p>
          Continue to <Link to="/applications">Applications</Link> to prepare submissions, or{' '}
          <Link to="/documents">Documents</Link> once upload flows are enabled.
        </p>
      ) : null}

      {user?.role === 'REVIEWER' ? (
        <p>
          Open <Link to="/reviews">Reviews</Link> to inspect applications awaiting decisions.
        </p>
      ) : null}

      {user?.role === 'ADMIN' ? (
        <p>
          Use <Link to="/settings">Administration</Link> to manage users, document types and rules.
        </p>
      ) : null}

      {error ? (
        <div className="alert alert--error" role="alert">
          Could not reach the backend health endpoint at <code>{apiBaseUrl}/health</code>. ({error})
        </div>
      ) : null}

      {!loading && !error && health?.success ? (
        <div className="alert alert--success" role="status">
          Backend is healthy as of {new Date(health.data?.timestamp ?? '').toLocaleString()}.
        </div>
      ) : null}
    </section>
  );
}
