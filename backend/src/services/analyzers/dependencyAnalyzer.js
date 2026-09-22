const { getContentsByBasename, parseJson } = require('../../utils/contentUtils');

const LOCKFILES = [
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm'],
  ['yarn.lock', 'Yarn'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['bun.lockb', 'Bun'],
  ['bun.lock', 'Bun'],
  ['poetry.lock', 'Poetry'],
  ['Pipfile.lock', 'Pipenv'],
  ['Cargo.lock', 'Cargo'],
  ['composer.lock', 'Composer'],
  ['go.sum', 'Go modules'],
];

function analyzeDependencies(fileContents, filePaths) {
  const manifests = [];
  const packageFiles = getContentsByBasename(fileContents, 'package.json');
  let productionCount = 0;
  let developmentCount = 0;
  const scripts = [];
  const packageManagers = new Set();
  const unusualVersions = [];

  for (const { path, content } of packageFiles) {
    const packageJson = parseJson(content);
    if (!packageJson) continue;
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    productionCount += Object.keys(dependencies).length;
    developmentCount += Object.keys(devDependencies).length;
    manifests.push({
      path,
      type: 'npm',
      name: packageJson.name || null,
      productionDependencies: Object.keys(dependencies).length,
      developmentDependencies: Object.keys(devDependencies).length,
      hasBinary: Boolean(packageJson.bin),
      exposesModule: Boolean(packageJson.main || packageJson.module || packageJson.exports),
      private: packageJson.private === true,
    });

    for (const [name, command] of Object.entries(packageJson.scripts || {})) {
      scripts.push({ name, command, manifest: path });
    }
    for (const [name, version] of Object.entries({ ...dependencies, ...devDependencies })) {
      if (typeof version === 'string' && (/^(latest|\*)$/i.test(version) || /^(git\+|github:|https?:\/\/)/i.test(version))) {
        unusualVersions.push({
          name,
          version,
          manifest: path,
          reason: version === '*' || /^latest$/i.test(version)
            ? 'Floating version range'
            : 'Git or URL dependency',
        });
      }
    }
  }

  const pythonManifests = [
    ...getContentsByBasename(fileContents, 'requirements.txt').map(({ path, content }) => ({
      path,
      type: 'Python requirements',
      count: countRequirementLines(content),
    })),
    ...getContentsByBasename(fileContents, 'pyproject.toml').map(({ path }) => ({ path, type: 'Python project' })),
    ...getContentsByBasename(fileContents, 'Pipfile').map(({ path }) => ({ path, type: 'Pipenv' })),
  ];
  manifests.push(...pythonManifests);

  const additionalManifestNames = [
    ['pom.xml', 'Maven'],
    ['build.gradle', 'Gradle'],
    ['build.gradle.kts', 'Gradle'],
    ['Cargo.toml', 'Cargo'],
    ['go.mod', 'Go modules'],
    ['composer.json', 'Composer'],
    ['Gemfile', 'Bundler'],
  ];
  for (const [name, type] of additionalManifestNames) {
    for (const { path } of getContentsByBasename(fileContents, name)) {
      manifests.push({ path, type });
    }
  }

  for (const [lockfile, manager] of LOCKFILES) {
    if ((filePaths || []).some((path) => path.split('/').pop().toLowerCase() === lockfile.toLowerCase())) {
      packageManagers.add(manager);
    }
  }
  if (packageFiles.length && packageManagers.size === 0) packageManagers.add('npm-compatible');

  return {
    manifests,
    packageManagers: [...packageManagers],
    productionCount,
    developmentCount,
    totalCount: productionCount + developmentCount,
    scripts: scripts.slice(0, 30),
    unusualVersions: unusualVersions.slice(0, 20),
    summary: buildSummary(manifests, productionCount, developmentCount),
  };
}

function countRequirementLines(content) {
  return content.split(/\r?\n/).filter((line) => {
    const value = line.trim();
    return value && !value.startsWith('#') && !value.startsWith('-');
  }).length;
}

function buildSummary(manifests, productionCount, developmentCount) {
  if (manifests.length === 0) return 'No supported dependency manifest was read.';
  if (productionCount || developmentCount) {
    return `${productionCount} production and ${developmentCount} development dependency declaration(s) found.`;
  }
  return `${manifests.length} dependency manifest(s) found.`;
}

module.exports = { analyzeDependencies };
