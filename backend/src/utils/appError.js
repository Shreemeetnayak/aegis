class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function toPublicError(error) {
  if (error instanceof AppError) return error;

  const status = error && error.status;
  if (status === 404) {
    return new AppError('Repository not found or not available to this GitHub token.', {
      statusCode: 404,
      code: 'REPOSITORY_NOT_FOUND',
    });
  }
  if (status === 401) {
    return new AppError('GitHub authentication failed. Check the configured token.', {
      statusCode: 502,
      code: 'GITHUB_AUTH_FAILED',
    });
  }
  if (status === 403 || status === 429) {
    return new AppError('GitHub API rate limit reached. Configure a GITHUB_TOKEN or try again later.', {
      statusCode: 429,
      code: 'GITHUB_RATE_LIMITED',
    });
  }
  if (status >= 500) {
    return new AppError('GitHub is temporarily unavailable. Please try again shortly.', {
      statusCode: 502,
      code: 'GITHUB_UNAVAILABLE',
    });
  }

  return new AppError('Unable to analyze this repository right now.', {
    statusCode: 500,
    code: 'ANALYSIS_FAILED',
  });
}

module.exports = { AppError, toPublicError };
