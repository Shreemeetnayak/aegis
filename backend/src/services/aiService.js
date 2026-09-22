const { AppError } = require('../utils/appError');

const MAX_LIST_ITEMS = 6;

async function generateIntelligenceReport(evidence, { fetchImpl = global.fetch } = {}) {
  const fallback = buildDeterministicReport(evidence);
  const provider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const hasOpenAi = provider === 'openai' && process.env.OPENAI_API_KEY;
  const hasGemini = provider === 'gemini' && process.env.GEMINI_API_KEY;

  if (!hasOpenAi && !hasGemini) {
    return {
      ...fallback,
      source: 'deterministic',
      providerStatus: 'not_configured',
      notice: 'AI credentials are not configured, so this evidence-based report was generated deterministically.',
    };
  }

  try {
    const prompt = buildPrompt(evidence);
    const response = hasOpenAi
      ? await callOpenAi(prompt, fetchImpl)
      : await callGemini(prompt, fetchImpl);
    const report = normalizeAiReport(parseJsonResponse(response), fallback);
    return {
      ...report,
      source: 'ai',
      providerStatus: 'available',
      notice: 'AI narrative generated from the structured repository evidence shown in this report.',
    };
  } catch (error) {
    return {
      ...fallback,
      source: 'deterministic',
      providerStatus: 'failed',
      notice: 'The AI provider was unavailable, so this evidence-based report was generated deterministically.',
    };
  }
}

function buildDeterministicReport(evidence) {
  const repository = evidence.repository || {};
  const architecture = evidence.architecture || {};
  const frameworks = (evidence.frameworks && evidence.frameworks.frameworks || []).map((item) => item.name);
  const databases = (evidence.databases && evidence.databases.databases || []).map((item) => item.name);
  const quality = evidence.quality || { strengths: [], issues: [] };
  const description = cleanSentence(repository.description)
    || (evidence.readmeTitle ? `The README identifies this project as ${evidence.readmeTitle}.` : null)
    || 'Unable to determine the project purpose from the available repository metadata and selected files.';
  const stack = [...frameworks, ...databases].join(', ');

  return {
    summary: `${description}${stack ? ` Detected technology evidence includes ${stack}.` : ''}`,
    architectureExplanation: architecture.explanation || 'Unable to determine the architecture from the available repository data.',
    strengths: quality.strengths.slice(0, MAX_LIST_ITEMS).map((item) => item.evidence),
    concerns: quality.issues.slice(0, MAX_LIST_ITEMS).map((item) => item.evidence),
    recommendations: quality.issues
      .filter((item) => item.recommendation)
      .slice(0, MAX_LIST_ITEMS)
      .map((item) => item.recommendation),
    developerExperience: buildDeveloperExperience(evidence),
    technicalMaturity: buildMaturity(evidence),
  };
}

function buildPrompt(evidence) {
  const safeEvidence = {
    repository: {
      name: evidence.repository && evidence.repository.fullName,
      description: evidence.repository && evidence.repository.description,
      primaryLanguage: evidence.repository && evidence.repository.language,
    },
    languages: evidence.languages && evidence.languages.languages,
    frameworks: evidence.frameworks && evidence.frameworks.frameworks,
    databases: evidence.databases && evidence.databases.databases,
    architecture: evidence.architecture,
    testing: evidence.testing,
    docker: evidence.docker,
    cicd: evidence.cicd,
    dependencies: evidence.dependencies && {
      totalCount: evidence.dependencies.totalCount,
      packageManagers: evidence.dependencies.packageManagers,
      unusualVersions: evidence.dependencies.unusualVersions,
    },
    quality: evidence.quality,
    readmeExcerpt: evidence.readmeExcerpt,
  };

  return [
    'You are Aegis, a repository intelligence assistant.',
    'Write an evidence-bound technical report from the JSON below. Never invent files, features, technologies, deployment details, security findings, or behavior. If evidence is insufficient, write "Unable to determine from the available repository data."',
    'Return valid JSON only with exactly these keys: summary, architectureExplanation, strengths, concerns, recommendations, developerExperience, technicalMaturity.',
    'Each list must contain short, practical strings. Do not include credentials or reproduce secret-like strings.',
    JSON.stringify(safeEvidence),
  ].join('\n\n');
}

async function callOpenAi(prompt, fetchImpl) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  }, fetchImpl);
  if (!response.ok) throw new AppError('AI provider request failed');
  const data = await response.json();
  return data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
}

async function callGemini(prompt, fetchImpl) {
  const model = encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-2.0-flash');
  const key = encodeURIComponent(process.env.GEMINI_API_KEY);
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  }, fetchImpl);
  if (!response.ok) throw new AppError('AI provider request failed');
  const data = await response.json();
  return data && data.candidates && data.candidates[0] && data.candidates[0].content
    && data.candidates[0].content.parts && data.candidates[0].content.parts[0]
    && data.candidates[0].content.parts[0].text;
}

async function fetchWithTimeout(url, options, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 20_000);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonResponse(value) {
  if (typeof value !== 'string') throw new Error('AI response was empty');
  const stripped = value.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(stripped);
}

function normalizeAiReport(candidate, fallback) {
  if (!candidate || typeof candidate !== 'object') return fallback;
  return {
    summary: normalizeText(candidate.summary, fallback.summary),
    architectureExplanation: normalizeText(candidate.architectureExplanation, fallback.architectureExplanation),
    strengths: normalizeList(candidate.strengths, fallback.strengths),
    concerns: normalizeList(candidate.concerns, fallback.concerns),
    recommendations: normalizeList(candidate.recommendations, fallback.recommendations),
    developerExperience: normalizeText(candidate.developerExperience, fallback.developerExperience),
    technicalMaturity: normalizeText(candidate.technicalMaturity, fallback.technicalMaturity),
  };
}

function normalizeText(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().slice(0, 1_500);
}

function normalizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim().slice(0, 400));
  return cleaned.length ? cleaned.slice(0, MAX_LIST_ITEMS) : fallback;
}

function cleanSentence(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().slice(0, 500);
}

function buildDeveloperExperience(evidence) {
  const testing = evidence.testing && evidence.testing.hasTesting;
  const readme = Boolean(evidence.readmeTitle);
  const lockfile = evidence.dependencies && evidence.dependencies.packageManagers && evidence.dependencies.packageManagers.length > 0;
  if (testing && readme && lockfile) return 'The repository has visible setup and quality signals: documentation, test evidence, and a dependency lockfile.';
  if (readme) return 'A README is present, but the available evidence does not establish every local-development workflow.';
  return 'Developer setup guidance is limited in the selected repository evidence.';
}

function buildMaturity(evidence) {
  const strengths = evidence.quality && evidence.quality.strengths ? evidence.quality.strengths.length : 0;
  const issues = evidence.quality && evidence.quality.issues ? evidence.quality.issues.length : 0;
  if (strengths >= 4 && issues <= 1) return 'The observed repository signals indicate a comparatively mature engineering baseline.';
  if (strengths >= 2) return 'The repository shows some established engineering practices, with room for targeted improvements.';
  return 'Technical maturity cannot be assessed strongly from the available static repository evidence.';
}

module.exports = { generateIntelligenceReport, buildDeterministicReport };
