function analyzeArchitecture({ frameworks, filePaths, docker, structure, dependencies }) {
  const frameworkList = frameworks ? frameworks.frameworks || [] : [];
  const frameworkNames = new Set(frameworkList.map((item) => item.name));
  const frontendFrameworks = frameworkList.filter((item) => item.category === 'frontend');
  const backendFrameworks = frameworkList.filter((item) => item.category === 'backend');
  const paths = filePaths || [];
  const evidence = [];

  const hasServerless = paths.some((path) => /^(api|functions|netlify\/functions)\//i.test(path))
    || paths.some((path) => /^(serverless\.ya?ml|vercel\.json)$/i.test(path));
  const hasNextApiRoutes = paths.some((path) => /^(pages\/api|app\/api)\//i.test(path));
  const hasFrontend = frontendFrameworks.length > 0;
  const hasBackend = backendFrameworks.length > 0;
  const hasMultipleApps = paths.some((path) => /^(apps|packages|services)\//i.test(path));
  const packageManifests = (dependencies && dependencies.manifests || []).filter((manifest) => manifest.type === 'npm');
  const frameworkPackage = frameworkList.find((framework) => framework.isPackageItself);
  const exposesLibrary = packageManifests.some((manifest) => manifest.exposesModule && !manifest.private);

  let classification = 'Repository structure could not be classified confidently';
  let confidence = 'low';
  let explanation = 'The available repository evidence does not establish a specific application architecture.';

  if (hasMultipleApps && docker && docker.services && docker.services.length > 1) {
    classification = 'Multi-service repository';
    confidence = 'likely';
    evidence.push('Multiple application/service directories are present.', `${docker.services.length} Compose services were found.`);
    explanation = 'The repository appears to contain more than one deployable component. This is not enough on its own to prove a microservices architecture.';
  } else if (frameworkPackage && exposesLibrary) {
    classification = 'Software library';
    confidence = 'likely';
    evidence.push(
      `${frameworkPackage.name} is declared as this package's own name.`,
      'The package manifest exposes a module entry point.'
    );
    explanation = 'The repository appears to publish a reusable module. This classification is based on package metadata and does not establish all supported runtime contexts.';
  } else if (hasFrontend && hasBackend) {
    classification = 'Full-stack web application';
    confidence = 'detected';
    evidence.push(
      `Frontend evidence: ${frontendFrameworks.map((item) => item.name).join(', ')}.`,
      `Backend evidence: ${backendFrameworks.map((item) => item.name).join(', ')}.`
    );
    explanation = 'Both client-facing and server-side framework evidence were found in the repository.';
  } else if (frameworkNames.has('Next.js') && hasNextApiRoutes) {
    classification = 'Full-stack Next.js application';
    confidence = 'detected';
    evidence.push('Next.js is declared in a dependency manifest.', 'Next.js API route files are present.');
    explanation = 'The Next.js application includes API routes, indicating both UI and server-side behavior in one codebase.';
  } else if (hasServerless) {
    classification = 'Serverless or function-based application';
    confidence = 'likely';
    evidence.push('Function or serverless configuration paths were found.');
    explanation = 'Function-oriented paths or deployment configuration suggest a serverless deployment model, though the provider cannot always be confirmed statically.';
  } else if (hasFrontend) {
    classification = 'Frontend web application';
    confidence = 'detected';
    evidence.push(`Frontend evidence: ${frontendFrameworks.map((item) => item.name).join(', ')}.`);
    explanation = 'Frontend framework evidence was found without a separate backend framework signal.';
  } else if (hasBackend) {
    classification = 'Backend application or API';
    confidence = 'detected';
    evidence.push(`Backend evidence: ${backendFrameworks.map((item) => item.name).join(', ')}.`);
    explanation = 'Backend framework evidence was found without a separate frontend framework signal.';
  } else if (isCliRepository(paths)) {
    classification = 'Command-line application';
    confidence = 'likely';
    evidence.push('CLI-oriented entry point paths were found.');
    explanation = 'The repository layout suggests a command-line tool rather than a web application.';
  } else if (structure && structure.sourceFileCount > 0) {
    classification = 'Source code repository';
    confidence = 'low';
    evidence.push(`${structure.sourceFileCount} source file(s) were identified.`);
    explanation = 'Source files were found, but there is not enough framework or configuration evidence to classify the architecture more specifically.';
  }

  return { classification, confidence, evidence, explanation, components: inferComponents(paths, frameworkList) };
}

function isCliRepository(paths) {
  return paths.some((path) => /^(bin|cmd)\//i.test(path)) || paths.some((path) => /(^|\/)cli\.(js|ts|py)$/i.test(path));
}

function inferComponents(paths, frameworks) {
  const components = [];
  if (frameworks.some((item) => item.category === 'frontend')) components.push('Frontend');
  if (frameworks.some((item) => item.category === 'backend')) components.push('Backend/API');
  if (paths.some((path) => /(^|\/)(test|tests|__tests__|e2e)\//i.test(path))) components.push('Tests');
  if (paths.some((path) => /^\.github\/workflows\//i.test(path))) components.push('CI workflows');
  if (paths.some((path) => /(^|\/)Dockerfile/i.test(path) || /(^|\/)compose\.ya?ml$/i.test(path))) components.push('Container configuration');
  return components;
}

module.exports = { analyzeArchitecture };
