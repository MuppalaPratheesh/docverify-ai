type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="panel" aria-labelledby="page-heading">
      <p className="panel__eyebrow">Coming next</p>
      <h2 id="page-heading">{title}</h2>
      <p>{description}</p>

      <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
        <div className="form-field">
          <label htmlFor="notes">Working notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Feature implementation will appear here in later Phase 2 steps."
          />
        </div>
        <button type="submit" className="btn" disabled>
          Save draft (unavailable)
        </button>
      </form>
    </section>
  );
}
