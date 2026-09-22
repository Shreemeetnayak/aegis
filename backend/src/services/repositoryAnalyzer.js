const GitHubService = require('./githubService');
const { detectLanguages } = require('./analyzers/languageDetector');
const { detectFrameworks } = require('./analyzers/frameworkDetector');
const { detectDatabases } = require('./analyzers/databaseDetector');
const { detectDocker } = require('./analyzers/dockerDetector');
const { detectCICD } = require('./analyzers/cicdDetector');
const { detectTesting } = require('./analyzers/testingDetector');
const { analyzeDependencies } = require('./analyzers/dependencyAnalyzer');
const { analyzeStructure, isSourceFile } = require('./analyzers/structureAnalyzer');
const { analyzeMetrics } = require('./analyzers/metricsAnalyzer');
const { analyzeArchitecture } = require('./analyzers/architectureAnalyzer');
const { analyzeQuality } = require('./analyzers/qualityAnalyzer');
const { generateIntelligenceReport } = require('./aiService');

const MAX_SELECTED_FILES = 40;
const MAX_FILE_BYTES = 200_000;
const CONFIG_BASENAMES = new Set([
  'package.json', 'requirements.txt', 'pipfile', 'pyproject.toml', 'setup.py', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  'cargo.toml', 'go.mod', 'composer.json', 'gemfile', 'dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml',
  '.dockerignore', '.env.example', '.env.sample', '.env.template', '.nvmrc', '.node-version', 'vercel.json', 'netlify.toml',
  'serverless.yml', 'serverless.yaml', 'schema.prisma', 'next.config.js', 'next.config.mjs', 'next.config.ts', 'vite.config.js', 'vite.config.ts',
  'tailwind.config.js', 'tailwind.config.ts', 'tsconfig.json',
]);
const SOURCE_ENTRY_PATTERN = /(^|\/)(?:src\/)?(?:index|main|server|app|routes?|config|settings)\.(?:[cm]?js|jsx|tsx?|py|go|java)$/i;

class RepositoryAnalyzer {
  constructor({ githubService = new GitHubService(), intelligenceGenerator = generateIntelligenceReport } = {}) {
    this.githubService = githubService;
    this.intelligenceGenerator = intelligenceGenerator;
  }

  async analyze(owner, repo, { onProgress } = {}) {
    const progress = (stage, label, percent) => {
      if (typeof onProgress === 'function') onProgress({ stage, label, percent });
    };

    progress('connecting', 'Connecting to GitHub', 15);
    const repository = await this.githubService.getRepository(owner, repo);

    progress('fetching', 'Fetching repository metadata and file tree', 30);
    const [githubLanguages, treeResult, readme, branches, contributorCount] = await Promise.all([
      this.githubService.getLanguages(owner, repo),
      this.githubService.getTree(owner, repo, repository.defaultBranch),
      this.githubService.getReadme(owner, repo),
      this.githubService.getBranches(owner, repo),
      this.githubService.getContributorsCount(owner, repo),
    ]);

    const treeEntries = treeResult.tree || [];
    const filePaths = treeEntries.filter((entry) => entry.type === 'blob').map((entry) => entry.path);
    const selected = selectRelevantFiles(treeEntries);
    const workflowEntries = treeEntries.filter((entry) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(entry.path));

    progress('fetching', 'Reading relevant configuration and source files', 48);
    const [fileContents, workflows] = await Promise.all([
      this.githubService.getMultipleFiles(owner, repo, selected.paths, { maxBytes: MAX_FILE_BYTES, concurrency: 5 }),
      this.githubService.getWorkflows(owner, repo, workflowEntries),
    ]);
    addReadmeToContents(fileContents, readme, filePaths);

    progress('analyzing', 'Analyzing technology stack and repository structure', 65);
    const languages = detectLanguages(githubLanguages, filePaths);
    const frameworks = detectFrameworks(fileContents, filePaths);
    const databases = detectDatabases(fileContents, filePaths);
    const dependencies = analyzeDependencies(fileContents, filePaths);
    const docker = detectDocker(fileContents, filePaths);
    const cicd = detectCICD(workflows, filePaths);
    const testing = detectTesting(fileContents, filePaths);
    const structure = analyzeStructure(treeEntries);
    const architecture = analyzeArchitecture({ frameworks, filePaths, docker, structure, dependencies });
    const metrics = analyzeMetrics({ treeEntries, fileContents, languageAnalysis: languages, structure, repository });
    const quality = analyzeQuality({
      filePaths,
      treeEntries,
      fileContents,
      readme,
      testing,
      cicd,
      docker,
      dependencies,
      architecture,
    });

    progress('intelligence', 'Generating evidence-based intelligence', 82);
    const readmeTitle = getReadmeTitle(readme && readme.content);
    const intelligence = await this.intelligenceGenerator({
      repository,
      languages,
      frameworks,
      databases,
      architecture,
      testing,
      docker,
      cicd,
      dependencies,
      quality,
      readmeTitle,
      readmeExcerpt: excerpt(readme && readme.content, 2_500),
    });

    progress('generating', 'Preparing repository intelligence report', 95);
    return {
      generatedAt: new Date().toISOString(),
      repository: {
        ...repository,
        contributorCount,
        branches: branches.slice(0, 20),
        branchCount: branches.length,
        branchesTruncated: branches.length === 100,
        treeTruncated: Boolean(treeResult.truncated),
      },
      retrieval: {
        treeTruncated: Boolean(treeResult.truncated),
        selectedFileCount: Object.keys(fileContents).length,
        selectedFiles: Object.keys(fileContents).sort(),
        skippedLargeCandidateCount: selected.skippedLarge.length,
        skippedLargeCandidates: selected.skippedLarge.slice(0, 10),
        maxFileBytes: MAX_FILE_BYTES,
        safetyNote: 'Aegis performs static analysis only. Repository files are never executed or installed during analysis.',
      },
      technology: { languages, frameworks, databases, dependencies, docker, cicd, testing },
      architecture,
      structure,
      metrics,
      quality,
      intelligence,
    };
  }
}

function selectRelevantFiles(treeEntries) {
  const candidates = (treeEntries || [])
    .filter((entry) => entry.type === 'blob')
    .filter((entry) => !isIgnoredPath(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));
  const selected = [];
  const skippedLarge = [];
  const add = (entry) => {
    if (selected.some((candidate) => candidate.path === entry.path)) return;
    if ((entry.size || 0) > MAX_FILE_BYTES) {
      skippedLarge.push(entry.path);
      return;
    }
    if (selected.length < MAX_SELECTED_FILES) selected.push(entry);
  };

  for (const entry of candidates.filter((entry) => CONFIG_BASENAMES.has(entry.path.split('/').pop().toLowerCase()))) add(entry);
  for (const entry of candidates.filter((entry) => SOURCE_ENTRY_PATTERN.test(entry.path))) add(entry);
  for (const entry of candidates.filter((entry) => isSourceFile(entry.path)).slice(0, 16)) add(entry);

  return { paths: selected.map((entry) => entry.path), skippedLarge };
}

function isIgnoredPath(path) {
  return path.split('/').some((segment) => ['node_modules', '.git', 'vendor', 'dist', 'build', 'coverage', '.next', '.nuxt', 'target'].includes(segment));
}

function addReadmeToContents(fileContents, readme, filePaths) {
  if (!readme || !readme.content) return;
  const readmePath = (filePaths || []).find((path) => /^readme(?:\..+)?$/i.test(path.split('/').pop())) || readme.name || 'README.md';
  if (!fileContents[readmePath]) fileContents[readmePath] = String(readme.content).slice(0, 200_000);
}

function getReadmeTitle(content) {
  if (!content) return null;
  const heading = String(content).match(/^\s*#\s+(.+)$/m);
  return heading ? heading[1].trim().slice(0, 200) : null;
}

function excerpt(content, length) {
  return content ? String(content).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').slice(0, length) : null;
}

async function analyzeRepository(owner, repo, options = {}) {
  const analyzer = new RepositoryAnalyzer(options);
  return analyzer.analyze(owner, repo, options.analysisOptions || {});
}

module.exports = { RepositoryAnalyzer, analyzeRepository, selectRelevantFiles };
