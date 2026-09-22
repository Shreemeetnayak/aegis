const { getContentsByBasename } = require('../../utils/contentUtils');

function analyzeQuality({ filePaths, treeEntries, fileContents, readme, testing, cicd, docker, dependencies, architecture }) {
  const issues = [];
  const strengths = [];
  const paths = filePaths || [];
  const hasReadme = Boolean(readme) || paths.some((path) => /^readme(?:\..+)?$/i.test(path.split('/').pop()));
  const hasEnvExample = paths.some((path) => /^\.env\.(example|sample|template)$/i.test(path.split('/').pop()));
  const hasLockfile = (dependencies && dependencies.packageManagers && dependencies.packageManagers.length > 0);

  if (hasReadme) {
    strengths.push(item('README present', 'A README file is available for project context and setup guidance.', 'detected'));
  } else {
    issues.push(item('Documentation is limited', 'No README file was found on the default branch.', 'potential', 'Add a README with setup, environment, and usage instructions.'));
  }
  if (testing && testing.hasTesting) {
    strengths.push(item('Testing evidence found', testing.summary, 'detected'));
  } else {
    issues.push(item('No testing infrastructure detected', 'No test framework dependency or recognized test file was found.', 'potential', 'Add a focused unit-test suite and document the test command.'));
  }
  if (cicd && cicd.hasCICD) {
    strengths.push(item('CI/CD configuration found', cicd.summary, 'detected'));
  } else {
    issues.push(item('No CI/CD configuration detected', 'No supported CI provider configuration was found in the repository tree.', 'potential', 'Consider adding a CI workflow for build, lint, and test checks.'));
  }
  if (hasEnvExample) {
    strengths.push(item('Environment example present', 'An environment variable example/template file was found.', 'detected'));
  } else if (requiresRuntimeConfiguration(paths, architecture)) {
    issues.push(item('No environment example found', 'The project appears to have runtime configuration but no .env.example-style file was found.', 'potential', 'Document required environment variable names without committing secret values.'));
  }
  if (docker && docker.hasDocker) {
    strengths.push(item('Container configuration found', docker.summary, 'detected'));
  }
  if (hasLockfile) {
    strengths.push(item('Dependency lockfile found', `Package manager evidence: ${dependencies.packageManagers.join(', ')}.`, 'detected'));
  }
  if (dependencies && dependencies.unusualVersions.length > 0) {
    issues.push(item(
      'Non-pinned dependency declarations',
      `${dependencies.unusualVersions.length} dependency declaration(s) use a floating, Git, or URL version reference.`,
      'potential',
      'Review these declarations for reproducibility and supply-chain policy fit.',
      dependencies.unusualVersions.map((entry) => entry.manifest)
    ));
  }

  const largeFiles = (treeEntries || [])
    .filter((entry) => entry.type === 'blob' && entry.size >= 150_000 && isLikelySourceFile(entry.path))
    .sort((left, right) => right.size - left.size)
    .slice(0, 5);
  if (largeFiles.length > 0) {
    issues.push(item(
      'Large source modules detected',
      `${largeFiles.length} source file(s) are at least 150 KB according to GitHub tree metadata.`,
      'potential',
      'Review whether the largest modules can be split into cohesive units.',
      largeFiles.map((entry) => entry.path)
    ));
  }

  const secretSignals = findSecretSignals(fileContents);
  if (secretSignals.length > 0) {
    issues.push(item(
      'Potential secret-like literals detected',
      `${secretSignals.length} selected file(s) contain a sensitive-looking literal. Values are intentionally not returned.`,
      'potential',
      'Review the flagged files, revoke exposed credentials if necessary, and use environment-based configuration.',
      secretSignals
    ));
  }

  return {
    strengths,
    issues,
    scannedFiles: Object.keys(fileContents || {}).length,
    secretScanScope: 'Selected text files only; this is a heuristic and does not prove the presence or absence of secrets.',
  };
}

function item(title, evidence, status, recommendation = null, files = []) {
  return { title, evidence, status, recommendation, files: [...new Set(files)].slice(0, 10) };
}

function requiresRuntimeConfiguration(paths, architecture) {
  return (architecture && /application|api/i.test(architecture.classification))
    || paths.some((path) => /(^|\/)(config|settings|server|app)\./i.test(path));
}

function isLikelySourceFile(path) {
  return /\.(?:[cm]?js|jsx|tsx?|py|java|go|rs|rb|php|cs|cpp|c)$/i.test(path);
}

function findSecretSignals(fileContents) {
  const flagged = new Set();
  const literalAssignment = /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i;
  const providerToken = /(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,})/;

  for (const [path, content] of Object.entries(fileContents || {})) {
    if (/\.env\.(example|sample|template)$/i.test(path)) continue;
    const lines = String(content).split(/\r?\n/);
    if (lines.some((line) => literalAssignment.test(line) || providerToken.test(line))) {
      flagged.add(path);
    }
  }
  return [...flagged].slice(0, 10);
}

module.exports = { analyzeQuality };
