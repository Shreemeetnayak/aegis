const SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.java', '.kt', '.go', '.rs', '.rb', '.php', '.cs', '.c', '.cpp', '.h', '.vue', '.svelte', '.swift', '.scala', '.sh',
]);

const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', 'coverage', '.next', '.nuxt', 'target', '__pycache__']);

function analyzeStructure(treeEntries) {
  const paths = (treeEntries || []).filter((item) => item.type === 'blob').map((item) => item.path);
  const directories = new Set();
  for (const path of paths) {
    const segments = path.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join('/'));
    }
  }

  const rootDirectories = [...new Set(paths.filter((path) => path.includes('/')).map((path) => path.split('/')[0]))]
    .sort();
  const entryPoints = findEntryPoints(paths);
  const sourceFiles = paths.filter((path) => isSourceFile(path));

  return {
    tree: buildDisplayTree(paths),
    rootDirectories,
    directoryCount: directories.size,
    sourceFileCount: sourceFiles.length,
    entryPoints,
    specialFiles: findSpecialFiles(paths),
    summary: paths.length === 0
      ? 'The repository has no files on its default branch.'
      : `${paths.length} file(s) across ${directories.size} directory/directories.`,
  };
}

function buildDisplayTree(paths, { maxDepth = 4, maxChildren = 18 } = {}) {
  const root = { name: '.', type: 'directory', children: new Map() };
  for (const path of paths) {
    const segments = path.split('/');
    let current = root;
    for (let index = 0; index < Math.min(segments.length, maxDepth); index += 1) {
      const segment = segments[index];
      const isLast = index === segments.length - 1;
      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          type: isLast ? 'file' : 'directory',
          children: isLast ? null : new Map(),
        });
      }
      current = current.children.get(segment);
    }
    if (segments.length > maxDepth && current.type === 'directory') {
      current.truncated = true;
    }
  }
  return serialiseNode(root, maxChildren).children;
}

function serialiseNode(node, maxChildren) {
  if (node.type === 'file') return { name: node.name, type: 'file' };
  const children = [...node.children.values()]
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === 'directory' ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
  const visible = children.slice(0, maxChildren).map((child) => serialiseNode(child, maxChildren));
  if (children.length > maxChildren) {
    visible.push({ name: `${children.length - maxChildren} more item(s)`, type: 'more' });
  }
  return {
    name: node.name,
    type: 'directory',
    children: visible,
    truncated: Boolean(node.truncated),
  };
}

function findEntryPoints(paths) {
  const patterns = [
    /^(src\/)?(index|main|server|app)\.(js|mjs|cjs|ts|tsx|jsx|py|go|java)$/i,
    /^cmd\/[^/]+\/main\.go$/i,
    /^manage\.py$/i,
    /^src\/main\/java\//i,
    /^app\/(page|layout|route)\.(js|jsx|ts|tsx)$/i,
  ];
  return paths.filter((path) => patterns.some((pattern) => pattern.test(path))).slice(0, 20);
}

function findSpecialFiles(paths) {
  const wanted = ['README', 'LICENSE', 'Dockerfile', 'package.json', 'requirements.txt', 'pom.xml', 'go.mod', 'Cargo.toml'];
  return paths.filter((path) => wanted.some((name) => path.split('/').pop().toLowerCase() === name.toLowerCase())).slice(0, 30);
}

function isSourceFile(path) {
  if (path.split('/').some((segment) => IGNORED_SEGMENTS.has(segment))) return false;
  const filename = path.split('/').pop();
  const dot = filename.lastIndexOf('.');
  return dot >= 0 && SOURCE_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

module.exports = { analyzeStructure, isSourceFile, SOURCE_EXTENSIONS };
