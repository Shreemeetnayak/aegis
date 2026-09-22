/**
 * Language Detector
 * Determines programming languages from GitHub language data and file analysis.
 */

const EXTENSION_MAP = {
  '.js': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.jsx': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.go': 'Go',
  '.rs': 'Rust',
  '.c': 'C',
  '.h': 'C',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hpp': 'C++',
  '.cs': 'C#',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.m': 'Objective-C',
  '.mm': 'Objective-C',
  '.scala': 'Scala',
  '.clj': 'Clojure',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.erl': 'Erlang',
  '.hs': 'Haskell',
  '.lua': 'Lua',
  '.r': 'R',
  '.R': 'R',
  '.dart': 'Dart',
  '.pl': 'Perl',
  '.pm': 'Perl',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.ps1': 'PowerShell',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.zig': 'Zig',
  '.nim': 'Nim',
  '.jl': 'Julia',
};

/**
 * Detect languages from GitHub language API data and file tree.
 * @param {Object} githubLanguages - Language bytes from GitHub API { "JavaScript": 45000, ... }
 * @param {string[]} filePaths - Array of file paths from the repository tree
 * @returns {Object} Language analysis result
 */
function detectLanguages(githubLanguages, filePaths) {
  const result = {
    primary: null,
    languages: [],
    distribution: {},
    totalBytes: 0,
  };

  // Use GitHub language data as primary source (it's the most accurate)
  if (githubLanguages && Object.keys(githubLanguages).length > 0) {
    const totalBytes = Object.values(githubLanguages).reduce((sum, b) => sum + b, 0);
    result.totalBytes = totalBytes;

    const sorted = Object.entries(githubLanguages)
      .sort(([, a], [, b]) => b - a);

    result.primary = sorted[0][0];

    result.languages = sorted.map(([lang, bytes]) => ({
      name: lang,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
    }));

    result.distribution = Object.fromEntries(
      sorted.map(([lang, bytes]) => [
        lang,
        totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
      ])
    );
  }

  // Supplement with file extension analysis if GitHub data is limited
  if (filePaths && filePaths.length > 0) {
    const extensionCounts = {};
    for (const filePath of filePaths) {
      const ext = getExtension(filePath);
      if (ext && EXTENSION_MAP[ext]) {
        const lang = EXTENSION_MAP[ext];
        extensionCounts[lang] = (extensionCounts[lang] || 0) + 1;
      }
    }

    result.fileCountByLanguage = extensionCounts;

    // If GitHub data was empty, use file analysis
    if (!result.primary && Object.keys(extensionCounts).length > 0) {
      const sorted = Object.entries(extensionCounts).sort(([, a], [, b]) => b - a);
      result.primary = sorted[0][0];
      const totalFiles = sorted.reduce((sum, [, count]) => sum + count, 0);
      result.languages = sorted.map(([lang, count]) => ({
        name: lang,
        fileCount: count,
        percentage: Math.round((count / totalFiles) * 1000) / 10,
      }));
    }
  }

  return result;
}

function getExtension(filePath) {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return null;
  return filePath.substring(lastDot).toLowerCase();
}

module.exports = { detectLanguages };
