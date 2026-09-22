function formatCount(value) {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export default function RepositoryHeader({ repository, cached }) {
  return (
    <section className="repository-header card">
      <div className="repo-identity">
        {repository.owner?.avatar && <img className="avatar" src={repository.owner.avatar} alt="" />}
        <div>
          <div className="title-row">
            <h1>{repository.fullName || repository.name}</h1>
            {repository.archived && <span className="tag muted">Archived</span>}
            {cached && <span className="tag">Cached</span>}
          </div>
          <p>{repository.description || 'No repository description is available.'}</p>
          <div className="repo-meta">
            {repository.language && <span>{repository.language}</span>}
            <span>★ {formatCount(repository.stars)}</span>
            <span>⑂ {formatCount(repository.forks)}</span>
            {repository.license?.spdxId && <span>{repository.license.spdxId}</span>}
          </div>
        </div>
      </div>
      <a className="github-link" href={repository.htmlUrl} target="_blank" rel="noreferrer">View on GitHub ↗</a>
    </section>
  );
}
