const test = require('node:test');
const assert = require('node:assert/strict');
const { RepositoryAnalyzer, selectRelevantFiles } = require('../services/repositoryAnalyzer');
const { buildDeterministicReport } = require('../services/aiService');

const TREE = [
  { path: 'README.md', type: 'blob', size: 180 },
  { path: 'package.json', type: 'blob', size: 620 },
  { path: 'package-lock.json', type: 'blob', size: 2_000 },
  { path: '.env.example', type: 'blob', size: 30 },
  { path: 'Dockerfile', type: 'blob', size: 250 },
  { path: 'docker-compose.yml', type: 'blob', size: 240 },
  { path: '.dockerignore', type: 'blob', size: 30 },
  { path: 'prisma/schema.prisma', type: 'blob', size: 120 },
  { path: '.github/workflows/ci.yml', type: 'blob', size: 300 },
  { path: 'src/App.jsx', type: 'blob', size: 220 },
  { path: 'src/server.js', type: 'blob', size: 280 },
  { path: 'src/secret.js', type: 'blob', size: 90 },
  { path: 'tests/app.test.js', type: 'blob', size: 140 },
  { path: 'node_modules/library/index.js', type: 'blob', size: 20 },
];

const CONTENTS = {
  'package.json': JSON.stringify({
    name: 'sample-full-stack',
    scripts: { test: 'node --test', build: 'vite build' },
    dependencies: { react: '^18.3.1', express: '^4.21.0', '@prisma/client': '^5.0.0', pg: '^8.0.0' },
    devDependencies: { vitest: '^2.0.0' },
  }),
  '.env.example': 'DATABASE_URL=postgresql://user:password@localhost/db\n',
  Dockerfile: 'FROM node:22-alpine AS build\nWORKDIR /app\nFROM node:22-alpine\nEXPOSE 3000\n',
  'docker-compose.yml': 'services:\n  web:\n    build: .\n  db:\n    image: postgres:16\n',
  'prisma/schema.prisma': 'datasource db { provider = "postgresql" url = env("DATABASE_URL") }',
  'src/App.jsx': 'export default function App() { return <main>Aegis</main>; }',
  'src/server.js': "const express = require('express'); const app = express(); app.get('/health', (_, res) => res.send('ok'));",
  'src/secret.js': "const API_KEY = 'ghp_abcdefghijklmnopqrstuvwxyz1234567890';",
  'tests/app.test.js': "test('works', () => {});",
};

function createGitHubFixture() {
  return {
    async getRepository() {
      return {
        name: 'sample-full-stack', fullName: 'example/sample-full-stack', description: 'A fixture application.',
        owner: { login: 'example', avatar: null, type: 'User' }, stars: 1, forks: 0, watchers: 1, openIssues: 0,
        size: 10, defaultBranch: 'main', language: 'JavaScript', topics: [], license: null, visibility: 'public',
        hasIssues: true, hasWiki: false, hasPages: false, createdAt: null, updatedAt: null, pushedAt: null,
        htmlUrl: 'https://github.com/example/sample-full-stack', archived: false, disabled: false,
      };
    },
    async getLanguages() { return { JavaScript: 750, CSS: 250 }; },
    async getTree() { return { sha: 'fixture', truncated: false, tree: TREE }; },
    async getReadme() { return { name: 'README.md', size: 180, content: '# Sample application\n\nA test fixture.' }; },
    async getBranches() { return [{ name: 'main', protected: true }]; },
    async getContributorsCount() { return 1; },
    async getMultipleFiles(owner, repo, paths) {
      return Object.fromEntries(paths.filter((path) => CONTENTS[path]).map((path) => [path, CONTENTS[path]]));
    },
    async getWorkflows() {
      return [{
        name: 'ci.yml', path: '.github/workflows/ci.yml', size: 300,
        content: 'on: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test\n      - run: npm run build\n',
      }];
    },
  };
}

test('RepositoryAnalyzer builds an evidence-based report from repository data', async () => {
  const stages = [];
  const analyzer = new RepositoryAnalyzer({
    githubService: createGitHubFixture(),
    intelligenceGenerator: async (evidence) => ({ ...buildDeterministicReport(evidence), source: 'deterministic', providerStatus: 'not_configured', notice: 'Fixture report.' }),
  });

  const result = await analyzer.analyze('example', 'sample-full-stack', {
    onProgress: (progress) => stages.push(progress.stage),
  });

  assert.equal(result.repository.fullName, 'example/sample-full-stack');
  assert.equal(result.technology.languages.primary, 'JavaScript');
  assert.deepEqual(result.technology.frameworks.frameworks.map((item) => item.name).slice(0, 4), ['Node.js', 'React', 'Express', 'Prisma']);
  assert.ok(result.technology.databases.databases.some((item) => item.name === 'PostgreSQL' && item.confidence === 'detected'));
  assert.equal(result.technology.docker.hasDocker, true);
  assert.equal(result.technology.cicd.hasCICD, true);
  assert.equal(result.technology.testing.hasTesting, true);
  assert.equal(result.architecture.classification, 'Full-stack web application');
  assert.ok(result.quality.issues.some((item) => item.title === 'Potential secret-like literals detected'));
  assert.equal(JSON.stringify(result).includes('ghp_abcdefghijklmnopqrstuvwxyz1234567890'), false);
  assert.deepEqual(stages, ['connecting', 'fetching', 'fetching', 'analyzing', 'intelligence', 'generating']);
});

test('file selection is bounded and excludes ignored directories', () => {
  const selected = selectRelevantFiles(TREE);
  assert.ok(selected.paths.includes('package.json'));
  assert.equal(selected.paths.includes('node_modules/library/index.js'), false);
  assert.ok(selected.paths.length <= 40);
});
