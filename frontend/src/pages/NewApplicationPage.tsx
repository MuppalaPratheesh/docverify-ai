import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { createApplication } from '../lib/applicationsApi';

export function NewApplicationPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await createApplication(notes.trim() || undefined);
      navigate(`/applications/${response.data.application.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create application');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="new-application-heading">
      <p className="panel__eyebrow">New application</p>
      <h2 id="new-application-heading">Start a draft application</h2>
      <p>
        Create a draft, upload PDF/JPG/PNG documents (max 10 MB each), then submit when ready.
        Use only synthetic or anonymized files.
      </p>

      <form className="form-grid form-grid--wide" onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add context for reviewers. Notes remain editable while the application is in draft."
          />
        </div>

        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="button-row">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create draft'}
          </button>
          <Link className="btn btn--secondary" to="/applications">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
