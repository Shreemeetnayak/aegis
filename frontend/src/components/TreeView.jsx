export default function TreeView({ nodes, depth = 0 }) {
  if (!nodes?.length) return <p className="empty-copy">No file tree data is available.</p>;
  return (
    <ul className={`tree depth-${depth}`}>
      {nodes.map((node) => <TreeNode key={`${depth}-${node.name}`} node={node} depth={depth} />)}
    </ul>
  );
}

function TreeNode({ node, depth }) {
  if (node.type === 'file') return <li className="tree-file"><span aria-hidden="true">·</span>{node.name}</li>;
  if (node.type === 'more') return <li className="tree-more">… {node.name}</li>;
  return (
    <li className="tree-directory">
      <details open={depth < 1}>
        <summary>{node.name}/ {node.truncated && <span className="muted">(deeper paths hidden)</span>}</summary>
        <TreeView nodes={node.children} depth={depth + 1} />
      </details>
    </li>
  );
}
