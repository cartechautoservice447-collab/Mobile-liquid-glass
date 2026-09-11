export default function PerformanceVisibility({ performance, setPerformanceMode }) {
  return (
    <section className="engine-performance-feature" aria-labelledby="engine-performance-title">
      <div className="engine-section-heading">
        <span id="engine-performance-title">Performance</span>
        <small>Choose lighter High mode or richer Ultra glass effects.</small>
      </div>
      <div className="engine-performance-switch" role="group" aria-label="Performance mode">
        <button
          type="button"
          className={performance === 'high' ? 'active' : ''}
          onClick={() => setPerformanceMode('high')}
          aria-pressed={performance === 'high'}
        >
          High
        </button>
        <button
          type="button"
          className={performance === 'ultra' ? 'active' : ''}
          onClick={() => setPerformanceMode('ultra')}
          aria-pressed={performance === 'ultra'}
        >
          Ultra
        </button>
      </div>
    </section>
  );
}
