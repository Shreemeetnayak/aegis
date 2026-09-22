function detectCICD(workflows, filePaths) {
  const providers = new Set();
  const analyzedWorkflows = [];
  const paths = filePaths || [];

  if (workflows && workflows.length) {
    providers.add('GitHub Actions');
    for (const workflow of workflows) analyzedWorkflows.push(analyzeWorkflow(workflow));
  }
  const providerPaths = [
    ['.travis.yml', 'Travis CI'], ['.circleci/config.yml', 'CircleCI'], ['Jenkinsfile', 'Jenkins'],
    ['.gitlab-ci.yml', 'GitLab CI'], ['azure-pipelines.yml', 'Azure Pipelines'], ['bitbucket-pipelines.yml', 'Bitbucket Pipelines'],
  ];
  for (const [path, provider] of providerPaths) if (paths.includes(path)) providers.add(provider);
  if (paths.includes('vercel.json')) providers.add('Vercel');
  if (paths.includes('netlify.toml')) providers.add('Netlify');

  const hasCICD = providers.size > 0;
  const workflowTypes = [...new Set(analyzedWorkflows.flatMap((workflow) => workflow.types))];
  return {
    hasCICD,
    providers: [...providers],
    workflows: analyzedWorkflows,
    summary: hasCICD
      ? `${[...providers].join(', ')}${workflowTypes.length ? ` · ${workflowTypes.join(', ')}` : ''}`
      : 'No CI/CD configuration detected.',
  };
}

function analyzeWorkflow(workflow) {
  const content = workflow.content || '';
  const types = [];
  const checks = [
    [/\b(test|jest|pytest|vitest|mocha|spec)\b/i, 'testing'], [/\b(build|compile|tsc)\b/i, 'build'],
    [/\b(deploy|deployment|release|publish)\b/i, 'deployment'], [/\b(lint|eslint|prettier|biome)\b/i, 'linting'],
    [/\b(docker|container|image)\b/i, 'docker'], [/\b(security|audit|snyk|dependabot|codeql)\b/i, 'security'],
    [/\b(coverage|codecov|coveralls)\b/i, 'coverage'],
  ];
  for (const [pattern, type] of checks) if (pattern.test(content)) types.push(type);
  const triggers = [];
  for (const [pattern, trigger] of [[/\bpush\s*:/m, 'push'], [/\bpull_request\s*:/m, 'pull_request'], [/\bschedule\s*:/m, 'schedule'], [/\bworkflow_dispatch\s*:/m, 'manual'], [/\brelease\s*:/m, 'release']]) {
    if (pattern.test(content)) triggers.push(trigger);
  }
  const actions = [...new Set((content.match(/^\s*uses:\s*([^\s#]+)/gm) || []).map((line) => line.replace(/^\s*uses:\s*/, '')))];
  return { name: workflow.name, path: workflow.path, types: types.length ? types : ['general'], triggers, actions: actions.slice(0, 20) };
}

module.exports = { detectCICD, analyzeWorkflow };
