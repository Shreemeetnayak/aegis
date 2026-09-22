const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../app');
const { parseGitHubUrl } = require('../controllers/analyzeController');

const report = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  repository: { fullName: 'owner/repository' },
  retrieval: {}, technology: {}, architecture: {}, structure: {}, metrics: {}, quality: {}, intelligence: {},
};

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function createDependencies() {
  const entries = new Map();
  const calls = [];
  return {
    calls,
    analyzer: {
      async analyze(owner, repo, { onProgress }) {
        calls.push([owner, repo]);
        onProgress?.({ stage: 'connecting', label: 'Connecting to GitHub', percent: 15 });
        onProgress?.({ stage: 'analyzing', label: 'Analyzing repository', percent: 65 });
        return { ...report, repository: { fullName: `${owner}/${repo}` } };
      },
    },
    cache: {
      getAnalysisCache(owner, repo) { return entries.get(`${owner}/${repo}`) || null; },
      setAnalysisCache(owner, repo, value) { entries.set(`${owner}/${repo}`, value); },
    },
  };
}

test('parseGitHubUrl accepts canonical HTTPS repository URLs only', () => {
  assert.deepEqual(parseGitHubUrl('https://github.com/Owner/Repository.git/'), { owner: 'Owner', repo: 'Repository' });
  assert.equal(parseGitHubUrl('http://github.com/Owner/Repository'), null);
  assert.equal(parseGitHubUrl('https://github.com/Owner/Repository/issues'), null);
  assert.equal(parseGitHubUrl('https://example.com/Owner/Repository'), null);
});

test('analysis API validates input, returns a report, and uses its cache', async () => {
  const dependencies = createDependencies();
  await withServer(createApp(dependencies), async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'not-a-url' }) });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_REPOSITORY_URL');

    const first = await fetch(`${baseUrl}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://github.com/Owner/Repository' }) });
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.success, true);
    assert.equal(firstBody.cached, false);
    assert.equal(firstBody.data.repository.fullName, 'owner/repository');

    const second = await fetch(`${baseUrl}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://github.com/owner/repository' }) });
    assert.equal((await second.json()).cached, true);
    assert.equal(dependencies.calls.length, 1);
  });
});

test('stream endpoint emits actual progress events and a report', async () => {
  const dependencies = createDependencies();
  await withServer(createApp(dependencies), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://github.com/owner/repository' }) });
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /event: progress/);
    assert.match(body, /"stage":"validating"/);
    assert.match(body, /"stage":"analyzing"/);
    assert.match(body, /event: result/);
  });
});
