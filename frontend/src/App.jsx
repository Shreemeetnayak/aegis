import { useRef, useState } from 'react';
import { analyzeRepository, ApiError } from './api';
import ProgressTracker from './components/ProgressTracker';
import ReportDashboard from './components/ReportDashboard';

const initialProgress = { stage: 'validating', label: 'Waiting for a repository URL', percent: 0 };

export default function App() {
  const [url, setUrl] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
  const [cached, setCached] = useState(false);
  const controllerRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!url.trim() || loading) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    setReport(null);
    setCached(false);
    setProgress({ stage: 'validating', label: 'Validating repository URL', percent: 2 });
    try {
      const response = await analyzeRepository(url.trim(), { signal: controller.signal, onProgress: setProgress });
      setCached(response.cached);
      setProgress({ stage: 'complete', label: 'Report ready', percent: 100 });
      setReport(response.data);
      requestAnimationFrame(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError instanceof ApiError ? requestError.message : 'Unable to connect to the Aegis API. Confirm the backend is running.');
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header"><a className="brand" href="#top" aria-label="Aegis home"><span className="brand-mark">A</span><span>Aegis</span></a><span className="header-note">Repository Intelligence</span></header>
      <main id="top">
        <section className="hero">
          <p className="eyebrow">GitHub repository intelligence</p>
          <h1>Understand an unfamiliar codebase before you open the editor.</h1>
          <p className="hero-copy">Aegis reads real public GitHub repository data, maps the technology stack and architecture, and produces an evidence-based technical report.</p>
          <form className="repository-form" onSubmit={handleSubmit}>
            <label htmlFor="repository-url">Enter a GitHub repository</label>
            <div className="input-row"><input id="repository-url" type="url" autoComplete="url" spellCheck="false" placeholder="https://github.com/owner/repository" value={url} onChange={(event) => setUrl(event.target.value)} disabled={loading} required /><button type="submit" disabled={loading}>{loading ? 'Analyzing…' : 'Analyze repository'}</button></div>
            <p className="form-note">Public repositories work without sign-in. A GitHub token on the server increases API limits; Aegis never executes repository code.</p>
          </form>
        </section>
        {error && <section className="error-panel" role="alert"><strong>Analysis could not start</strong><p>{error}</p></section>}
        {loading && <ProgressTracker progress={progress} cached={cached} />}
        {report && <ReportDashboard report={report} cached={cached} />}
      </main>
      <footer><span>Aegis</span><span>Static GitHub repository intelligence</span></footer>
    </div>
  );
}
