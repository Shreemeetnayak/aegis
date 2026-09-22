const STAGES = [
  ['validating', 'Validating repository'],
  ['connecting', 'Connecting to GitHub'],
  ['fetching', 'Fetching repository data'],
  ['analyzing', 'Analyzing technology and structure'],
  ['intelligence', 'Running intelligence analysis'],
  ['generating', 'Generating report'],
];

export default function ProgressTracker({ progress, cached }) {
  const activeIndex = STAGES.findIndex(([stage]) => stage === progress.stage);
  return (
    <section className="progress-panel" aria-live="polite" aria-label="Repository analysis progress">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Analysis in progress</p>
          <h2>{progress.label || 'Preparing analysis'}</h2>
        </div>
        <span className="progress-percent">{progress.percent || 0}%</span>
      </div>
      <ol className="progress-list">
        {STAGES.map(([stage, label], index) => {
          const completed = activeIndex > index || progress.stage === 'complete';
          const active = progress.stage === stage;
          return (
            <li key={stage} className={completed ? 'complete' : active ? 'active' : ''}>
              <span className="progress-mark" aria-hidden="true">{completed ? '✓' : active ? '●' : '○'}</span>
              <span>{active ? progress.label : label}</span>
            </li>
          );
        })}
      </ol>
      {cached && <p className="muted-note">A recent cached report was returned; no additional GitHub requests were made.</p>}
    </section>
  );
}
