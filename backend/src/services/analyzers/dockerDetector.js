const { getContentsByBasename } = require('../../utils/contentUtils');

function detectDocker(fileContents, filePaths) {
  const files = [];
  const baseImages = [];
  const dockerfiles = (filePaths || []).filter((path) => /^dockerfile(?:\..+)?$/i.test(path.split('/').pop()));
  const composeFiles = getContentsByBasename(fileContents, ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']);
  const dockerIgnore = (filePaths || []).filter((path) => path.split('/').pop() === '.dockerignore');

  for (const path of dockerfiles) files.push({ name: path, type: 'Dockerfile' });
  for (const { path } of composeFiles) files.push({ name: path, type: 'Docker Compose' });
  for (const path of dockerIgnore) files.push({ name: path, type: 'Docker Ignore' });

  const dockerfileContents = getContentsByBasename(fileContents, ['Dockerfile', 'dockerfile']);
  const analyses = dockerfileContents.map(({ path, content }) => {
    const fromLines = content.match(/^\s*FROM\s+(.+)$/gim) || [];
    const images = fromLines.map((line) => line.replace(/^\s*FROM\s+/i, '').trim());
    baseImages.push(...images);
    return {
      path,
      hasMultiStage: fromLines.length > 1,
      hasHealthcheck: /^\s*HEALTHCHECK\b/im.test(content),
      hasExpose: /^\s*EXPOSE\b/im.test(content),
      hasWorkdir: /^\s*WORKDIR\b/im.test(content),
      stages: fromLines.length,
    };
  });
  const services = composeFiles.flatMap(({ path, content }) => parseComposeServices(content).map((name) => ({ name, composeFile: path })));
  const hasKubernetes = (filePaths || []).some((path) => /(^|\/)(k8s|kubernetes)\//i.test(path) || /(^|\/)(deployment|service)\.ya?ml$/i.test(path));
  const hasDocker = files.length > 0;

  return {
    hasDocker,
    files,
    services,
    baseImages: [...new Set(baseImages)],
    dockerfiles: analyses,
    hasKubernetes,
    summary: buildSummary(hasDocker, dockerfiles.length, services.length, baseImages),
  };
}

function parseComposeServices(content) {
  const services = [];
  const lines = content.split(/\r?\n/);
  let servicesIndent = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.search(/\S/);
    if (/^\s*services\s*:\s*(?:#.*)?$/i.test(line)) {
      servicesIndent = indent;
      continue;
    }
    if (servicesIndent === null) continue;
    if (indent <= servicesIndent) {
      servicesIndent = null;
      continue;
    }
    const match = line.match(/^\s{2,}([A-Za-z0-9_.-]+)\s*:\s*(?:#.*)?$/);
    if (match && indent === servicesIndent + 2) services.push(match[1]);
  }
  return [...new Set(services)];
}

function buildSummary(hasDocker, dockerfileCount, serviceCount, baseImages) {
  if (!hasDocker) return 'No Docker or Compose configuration detected.';
  const details = [];
  if (dockerfileCount) details.push(`${dockerfileCount} Dockerfile(s)`);
  if (serviceCount) details.push(`${serviceCount} Compose service(s)`);
  if (baseImages.length) details.push(`Base image(s): ${[...new Set(baseImages)].join(', ')}`);
  return details.join(' · ');
}

module.exports = { detectDocker, parseComposeServices };
