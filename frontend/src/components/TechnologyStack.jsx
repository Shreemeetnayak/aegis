import StatusPill from './StatusPill';

export default function TechnologyStack({ technology }) {
  const { languages, frameworks, databases } = technology;
  return (
    <section className="card stack-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Technology stack</p>
          <h2>Observed technologies</h2>
        </div>
      </div>
      <div className="stack-groups">
        <StackGroup title="Languages" empty="No language data available." items={languages.languages} render={(item) => (
          <span className="tech-chip" key={item.name}>{item.name}{item.percentage != null && <small>{item.percentage}%</small>}</span>
        )} />
        <StackGroup title="Frameworks & tooling" empty="No framework evidence was found in selected manifests." items={frameworks.frameworks} render={(item) => (
          <span className="tech-chip evidence-chip" key={`${item.name}-${item.category}`} title={item.evidence}>{item.name}<small>{item.category}</small></span>
        )} />
        <StackGroup title="Databases" empty="No database technology was detected." items={databases.databases} render={(item) => (
          <div className="detection-row" key={item.name}>
            <span>{item.name}</span><StatusPill status={item.confidence} />
          </div>
        )} />
      </div>
    </section>
  );
}

function StackGroup({ title, items, empty, render }) {
  return <div className="stack-group"><h3>{title}</h3><div className="chip-list">{items?.length ? items.map(render) : <p className="empty-copy">{empty}</p>}</div></div>;
}
