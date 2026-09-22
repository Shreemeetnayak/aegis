import RepositoryHeader from './RepositoryHeader';
import TechnologyStack from './TechnologyStack';
import TreeView from './TreeView';
import StatusPill from './StatusPill';

const number = (value) => typeof value === 'number' ? new Intl.NumberFormat().format(value) : '—';

export default function ReportDashboard({ report, cached }) {
  const { repository, technology, architecture, structure, metrics, quality, intelligence, retrieval } = report;
  const { docker, cicd, testing, dependencies } = technology;
  return (
    <main className="dashboard" id="report">
      <RepositoryHeader repository={repository} cached={cached} />
      <p className="report-time">Report generated {new Date(report.generatedAt).toLocaleString()}{repository.treeTruncated ? ' · GitHub returned a truncated file tree' : ''}</p>

      <section className="metric-grid" aria-label="Repository metrics">
        <Metric label="Files" value={number(metrics.totalFiles)} detail={`${number(metrics.sourceFiles)} source`} />
        <Metric label="Directories" value={number(metrics.directoryCount)} detail={`${number(metrics.languageCount)} languages`} />
        <Metric label="Dependencies" value={number(dependencies.totalCount)} detail={dependencies.packageManagers.join(', ') || 'Not identified'} />
        <Metric label="Sampled source lines" value={number(metrics.sampledSourceLines)} detail="Selected static files" />
        <Metric label="Branches" value={number(repository.branchCount)} detail={repository.branchesTruncated ? 'First 100 queried' : 'Default branch analyzed'} />
        <Metric label="Contributors" value={number(repository.contributorCount)} detail={repository.size != null ? `${number(repository.size)} KB on GitHub` : 'Unavailable'} />
      </section>

      <div className="content-grid">
        <TechnologyStack technology={technology} />
        <section className="card architecture-card">
          <p className="eyebrow">Architecture</p>
          <div className="title-row"><h2>{architecture.classification}</h2><StatusPill status={architecture.confidence} /></div>
          <p>{architecture.explanation}</p>
          <EvidenceList items={architecture.evidence} empty="No architecture evidence was collected." />
          {architecture.components?.length > 0 && <div className="component-flow">{architecture.components.map((component) => <span key={component}>{component}</span>)}</div>}
        </section>
      </div>

      <section className="capability-grid" aria-label="Engineering capabilities">
        <Capability title="Docker" detected={docker.hasDocker} summary={docker.summary} details={docker.files.map((file) => file.name)} />
        <Capability title="CI/CD" detected={cicd.hasCICD} summary={cicd.summary} details={cicd.workflows.map((workflow) => `${workflow.name}: ${workflow.types.join(', ')}`)} />
        <Capability title="Testing" detected={testing.hasTesting} summary={testing.summary} details={[...testing.frameworks.map((framework) => framework.name), ...(testing.testScript ? [`Script: ${testing.testScript}`] : [])]} />
      </section>

      <div className="content-grid lower-grid">
        <section className="card quality-card">
          <div className="section-heading"><div><p className="eyebrow">Code quality signals</p><h2>Evidence, not verdicts</h2></div><span className="count-label">{quality.scannedFiles} files scanned</span></div>
          <div className="quality-columns">
            <FindingList title="Strengths" items={quality.strengths} kind="strength" empty="No positive signals were identified." />
            <FindingList title="Potential improvements" items={quality.issues} kind="issue" empty="No deterministic concerns were identified." />
          </div>
          <p className="muted-note">{quality.secretScanScope}</p>
        </section>
        <section className="card structure-card">
          <div className="section-heading"><div><p className="eyebrow">Repository structure</p><h2>{structure.summary}</h2></div></div>
          <div className="tree-wrap"><TreeView nodes={structure.tree} /></div>
        </section>
      </div>

      <section className="card intelligence-card">
        <div className="section-heading"><div><p className="eyebrow">Aegis intelligence</p><h2>Repository report</h2></div><span className="tag">{intelligence.source === 'ai' ? 'AI assisted' : 'Deterministic'}</span></div>
        <p className="intelligence-summary">{intelligence.summary}</p>
        <div className="intelligence-grid">
          <Narrative title="Architecture explanation" value={intelligence.architectureExplanation} />
          <Narrative title="Developer experience" value={intelligence.developerExperience} />
          <Narrative title="Technical maturity" value={intelligence.technicalMaturity} />
          <RecommendationList title="Recommendations" items={intelligence.recommendations} />
        </div>
        <div className="intelligence-grid lists"><RecommendationList title="Strengths" items={intelligence.strengths} /><RecommendationList title="Potential issues" items={intelligence.concerns} /></div>
        <p className="muted-note">{intelligence.notice}</p>
      </section>

      <section className="safety-bar"><span>Static analysis boundary</span><p>{retrieval.safetyNote} {metrics.sampledSourceLinesScope}</p></section>
    </main>
  );
}

function Metric({ label, value, detail }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function Capability({ title, detected, summary, details }) { return <section className="card capability-card"><div className="title-row"><h2>{title}</h2><StatusPill status={detected ? 'detected' : 'unknown'} /></div><p>{summary}</p><EvidenceList items={details} empty="No supporting files found." /></section>; }
function EvidenceList({ items, empty }) { return items?.length ? <ul className="evidence-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-copy">{empty}</p>; }
function FindingList({ title, items, kind, empty }) { return <div className={`finding-list ${kind}`}><h3>{title}</h3>{items?.length ? items.map((item) => <article key={item.title}><div className="title-row"><h4>{item.title}</h4><StatusPill status={item.status} /></div><p>{item.evidence}</p>{item.files?.length > 0 && <code>{item.files.join(', ')}</code>}{item.recommendation && <p className="recommendation">{item.recommendation}</p>}</article>) : <p className="empty-copy">{empty}</p>}</div>; }
function Narrative({ title, value }) { return <article className="narrative"><h3>{title}</h3><p>{value || 'Unable to determine from the available repository data.'}</p></article>; }
function RecommendationList({ title, items }) { return <article className="narrative"><h3>{title}</h3>{items?.length ? <ul className="evidence-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-copy">Unable to determine from the available repository data.</p>}</article>; }
