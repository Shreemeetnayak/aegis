const { RepositoryAnalyzer } = require('../services/repositoryAnalyzer');
const { getAnalysisCache, setAnalysisCache } = require('../database/db');
const { AppError, toPublicError } = require('../utils/appError');

function parseGitHubUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) return null;
    const parts = parsed.pathname.replace(/\/+$/, '').replace(/\.git$/i, '').split('/').filter(Boolean);
    if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

function createAnalyzeController({ analyzer = new RepositoryAnalyzer(), cache = { getAnalysisCache, setAnalysisCache } } = {}) {
  async function run(url, onProgress) {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      throw new AppError('Enter a valid HTTPS GitHub repository URL in the format https://github.com/owner/repository.', {
        statusCode: 400,
        code: 'INVALID_REPOSITORY_URL',
      });
    }
    if (onProgress) onProgress({ stage: 'validating', label: 'Repository URL validated', percent: 5 });

    const owner = parsed.owner.toLowerCase();
    const repo = parsed.repo.toLowerCase();
    const cached = cache.getAnalysisCache(owner, repo);
    if (cached) {
      if (onProgress) onProgress({ stage: 'generating', label: 'Loaded a recent analysis from cache', percent: 95 });
      return { result: cached, cached: true };
    }

    const result = await analyzer.analyze(owner, repo, { onProgress });
    cache.setAnalysisCache(owner, repo, result);
    return { result, cached: false };
  }

  async function analyze(req, res, next) {
    const startedAt = Date.now();
    try {
      const { result, cached } = await run(req.body && req.body.url);
      return res.json({ success: true, data: result, cached, durationMs: Date.now() - startedAt });
    } catch (error) {
      return next(toPublicError(error));
    }
  }

  async function analyzeFromParams(req, res, next) {
    return analyze({ ...req, body: { url: `https://github.com/${req.params.owner}/${req.params.repo}` } }, res, next);
  }

  async function stream(req, res) {
    const startedAt = Date.now();
    let closed = false;
    const send = (event, data) => {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    req.on('close', () => { closed = true; });
    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    try {
      const { result, cached } = await run(req.body && req.body.url, (progress) => send('progress', progress));
      send('result', { success: true, data: result, cached, durationMs: Date.now() - startedAt });
    } catch (error) {
      const publicError = toPublicError(error);
      send('error', { success: false, error: publicError.message, code: publicError.code });
    } finally {
      if (!closed) res.end();
    }
  }

  return { analyze, analyzeFromParams, stream, run };
}

module.exports = { createAnalyzeController, parseGitHubUrl };
