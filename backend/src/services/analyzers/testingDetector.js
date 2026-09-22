const { getContentsByBasename, parseJson } = require('../../utils/contentUtils');

const NPM_FRAMEWORKS = {
  jest: 'Jest', vitest: 'Vitest', mocha: 'Mocha', jasmine: 'Jasmine', ava: 'AVA', tap: 'Node TAP',
  '@testing-library/react': 'React Testing Library', '@testing-library/vue': 'Vue Testing Library',
  cypress: 'Cypress', playwright: 'Playwright', '@playwright/test': 'Playwright', supertest: 'Supertest',
  nyc: 'NYC (coverage)', c8: 'c8 (coverage)',
};
const PYTHON_FRAMEWORKS = { pytest: 'pytest', nose: 'nose', nose2: 'nose2', hypothesis: 'Hypothesis', selenium: 'Selenium', playwright: 'Playwright' };
const TEST_FILE = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$|(?:^|\/)test_[^/]+\.py$|_test\.py$|_test\.go$|Test\.java$|\.cy\.[cm]?[jt]sx?$)/i;

function detectTesting(fileContents, filePaths) {
  const frameworks = [];
  const frameworkNames = new Set();
  const addFramework = (name, source) => {
    if (!frameworkNames.has(name)) {
      frameworkNames.add(name);
      frameworks.push({ name, source });
    }
  };
  let testScript = null;
  for (const { path, content } of getContentsByBasename(fileContents, 'package.json')) {
    const packageJson = parseJson(content);
    if (!packageJson) continue;
    const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    for (const [dependency, name] of Object.entries(NPM_FRAMEWORKS)) if (dependencies[dependency]) addFramework(name, path);
    if (!testScript && packageJson.scripts && packageJson.scripts.test && !/no test specified/i.test(packageJson.scripts.test)) {
      testScript = packageJson.scripts.test;
    }
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'requirements.txt')) {
    const dependencies = content.split(/\r?\n/).map((line) => line.trim().split(/[=<>!~\[]/)[0].toLowerCase());
    for (const [dependency, name] of Object.entries(PYTHON_FRAMEWORKS)) if (dependencies.includes(dependency)) addFramework(name, path);
  }

  const paths = filePaths || [];
  const testFiles = paths.filter((path) => TEST_FILE.test(path));
  const testDirectories = [...new Set(paths
    .filter((path) => /(^|\/)(test|tests|__tests__|spec|specs|e2e|integration|cypress)\//i.test(path))
    .map((path) => path.split('/').slice(0, -1).join('/')))].slice(0, 20);
  const hasE2E = paths.some((path) => /(^|\/)(e2e|cypress|playwright)\//i.test(path)) || frameworks.some((item) => /Cypress|Playwright/.test(item.name));
  const hasIntegration = paths.some((path) => /(^|\/)integration\//i.test(path));
  const hasCoverage = paths.some((path) => /(?:\.nycrc(?:\.json)?|\.c8rc\.json|coverage|codecov)/i.test(path)) || frameworks.some((item) => /coverage/i.test(item.name));
  const hasTesting = frameworks.length > 0 || testFiles.length > 0 || Boolean(testScript);

  return {
    hasTesting,
    frameworks,
    testFiles: testFiles.slice(0, 40),
    testFileCount: testFiles.length,
    testDirectories,
    hasE2E,
    hasUnitTests: testFiles.length > 0 || frameworks.length > 0,
    hasIntegration,
    coverage: hasCoverage ? 'Configuration or dependency detected' : null,
    hasTestScript: Boolean(testScript),
    testScript,
    summary: hasTesting
      ? `${frameworks.map((item) => item.name).join(', ') || 'Test command'} · ${testFiles.length} recognized test file(s)`
      : 'No testing infrastructure detected.',
  };
}

module.exports = { detectTesting };
