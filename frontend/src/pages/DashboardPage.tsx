import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../config/env';

type HealthResponse = {
  success: boolean;
  data?: {
    status: string;
    service: string;
    environment: string;
    timestamp: string;
    uptimeSeconds: number;
  };
  error?: {
    message: string;
  };
};

const apiBaseUrl = getApiBaseUrl();


export function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          signal: controller.signal,
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
  }, []);

  return (
    <section className="panel" aria-labelledby="dashboard-heading">
      <p className="panel__eyebrow">Platform overview</p>
      <h2 id="dashboard-heading">Welcome to DocVerify AI</h2>
      <p>
        This Phase 2 scaffold provides the application shell, API health monitoring, and
        environment-ready project structure for academic document verification.
      </p>

      <div className="status-grid">
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
        <div className="status-card">
          <strong>Service</strong>
          <span>{health?.data?.service ?? 'docverify-ai-backend'}</span>
        </div>
      </div>

      {error ? (
        <div className="alert alert--error" role="alert">
          Could not reach the backend health endpoint at{' '}
          <code>{apiBaseUrl}/health</code>. Start the API with{' '}
          <code>npm run dev</code> in <code>/backend</code>. ({error})
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
