const { getContentsByBasename, parseJson } = require('../../utils/contentUtils');

const NPM_FRAMEWORKS = [
  ['next', 'Next.js', 'frontend'], ['react', 'React', 'frontend'], ['vue', 'Vue.js', 'frontend'],
  ['@angular/core', 'Angular', 'frontend'], ['svelte', 'Svelte', 'frontend'], ['nuxt', 'Nuxt.js', 'frontend'],
  ['gatsby', 'Gatsby', 'frontend'], ['astro', 'Astro', 'frontend'], ['@remix-run/react', 'Remix', 'frontend'],
  ['express', 'Express', 'backend'], ['fastify', 'Fastify', 'backend'], ['koa', 'Koa', 'backend'],
  ['@nestjs/core', 'NestJS', 'backend'], ['hapi', 'Hapi', 'backend'], ['@hapi/hapi', 'Hapi', 'backend'],
  ['react-native', 'React Native', 'mobile'], ['expo', 'Expo', 'mobile'], ['electron', 'Electron', 'desktop'],
  ['vite', 'Vite', 'build'], ['webpack', 'Webpack', 'build'], ['esbuild', 'esbuild', 'build'], ['turbo', 'Turborepo', 'build'],
  ['tailwindcss', 'Tailwind CSS', 'styling'], ['sass', 'Sass', 'styling'], ['styled-components', 'styled-components', 'styling'],
  ['@reduxjs/toolkit', 'Redux Toolkit', 'state'], ['zustand', 'Zustand', 'state'],
  ['graphql', 'GraphQL', 'api'], ['@apollo/server', 'Apollo Server', 'api'], ['trpc', 'tRPC', 'api'],
  ['prisma', 'Prisma', 'orm'], ['@prisma/client', 'Prisma', 'orm'], ['sequelize', 'Sequelize', 'orm'],
  ['typeorm', 'TypeORM', 'orm'], ['mongoose', 'Mongoose', 'orm'], ['drizzle-orm', 'Drizzle', 'orm'],
];

const PYTHON_FRAMEWORKS = {
  django: ['Django', 'backend'], flask: ['Flask', 'backend'], fastapi: ['FastAPI', 'backend'],
  starlette: ['Starlette', 'backend'], tornado: ['Tornado', 'backend'], sanic: ['Sanic', 'backend'],
  aiohttp: ['aiohttp', 'backend'], celery: ['Celery', 'task-queue'], sqlalchemy: ['SQLAlchemy', 'orm'],
  streamlit: ['Streamlit', 'frontend'], gradio: ['Gradio', 'frontend'],
};

function detectFrameworks(fileContents, filePaths) {
  const detected = [];
  const seen = new Set();
  const add = (name, category, evidence, version = null, extra = {}) => {
    if (seen.has(name)) return;
    seen.add(name);
    detected.push({ name, category, evidence, version, confidence: 'detected', ...extra });
  };

  const packageFiles = getContentsByBasename(fileContents, 'package.json');
  for (const { path, content } of packageFiles) {
    const packageJson = parseJson(content);
    if (!packageJson) continue;
    const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    add('Node.js', 'runtime', `package.json found at ${path}`);
    for (const [dependency, label, category] of NPM_FRAMEWORKS) {
      if (dependencies[dependency]) {
        add(label, category, `${dependency} in ${path}`, dependencies[dependency]);
      } else if (packageJson.name === dependency) {
        add(label, category, `${dependency} is the package name in ${path}`, packageJson.version || null, { isPackageItself: true });
      }
    }
  }

  for (const { path, content } of getContentsByBasename(fileContents, 'requirements.txt')) {
    for (const dependency of parseRequirements(content)) {
      const framework = PYTHON_FRAMEWORKS[dependency];
      if (framework) add(framework[0], framework[1], `${dependency} in ${path}`);
    }
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'pyproject.toml')) {
    for (const [dependency, framework] of Object.entries(PYTHON_FRAMEWORKS)) {
      if (new RegExp(`(^|[\\s\"'])${escapeRegExp(dependency)}([\\s\"'=<>]|$)`, 'i').test(content)) {
        add(framework[0], framework[1], `${dependency} referenced in ${path}`);
      }
    }
  }

  for (const { path, content } of getContentsByBasename(fileContents, 'pom.xml')) {
    if (/spring-boot/i.test(content)) add('Spring Boot', 'backend', `spring-boot in ${path}`);
    if (/spring-web/i.test(content)) add('Spring Web', 'backend', `spring-web in ${path}`);
  }
  for (const { path, content } of [...getContentsByBasename(fileContents, 'build.gradle'), ...getContentsByBasename(fileContents, 'build.gradle.kts')]) {
    if (/spring-boot/i.test(content)) add('Spring Boot', 'backend', `spring-boot in ${path}`);
    if (/org\.jetbrains\.kotlin/i.test(content)) add('Kotlin', 'language', `Kotlin plugin in ${path}`);
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'Cargo.toml')) {
    if (/\bactix-web\b/i.test(content)) add('Actix Web', 'backend', `actix-web in ${path}`);
    if (/\brocket\b/i.test(content)) add('Rocket', 'backend', `rocket in ${path}`);
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'composer.json')) {
    const composer = parseJson(content);
    const dependencies = composer ? { ...(composer.require || {}), ...(composer['require-dev'] || {}) } : {};
    if (dependencies['laravel/framework']) add('Laravel', 'backend', `laravel/framework in ${path}`, dependencies['laravel/framework']);
    if (dependencies['symfony/framework-bundle']) add('Symfony', 'backend', `symfony/framework-bundle in ${path}`, dependencies['symfony/framework-bundle']);
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'go.mod')) {
    if (/github\.com\/gin-gonic\/gin/i.test(content)) add('Gin', 'backend', `gin-gonic/gin in ${path}`);
    if (/github\.com\/gofiber\/fiber/i.test(content)) add('Fiber', 'backend', `gofiber/fiber in ${path}`);
  }

  for (const path of filePaths || []) {
    const basename = path.split('/').pop();
    if (/^next\.config\.(?:js|mjs|ts)$/i.test(basename)) add('Next.js', 'frontend', `${path} found`);
    if (/^vite\.config\.(?:js|mjs|ts)$/i.test(basename)) add('Vite', 'build', `${path} found`);
    if (/^tailwind\.config\.(?:js|cjs|mjs|ts)$/i.test(basename)) add('Tailwind CSS', 'styling', `${path} found`);
  }

  return { frameworks: detected, count: detected.length, categories: groupByCategory(detected) };
}

function parseRequirements(content) {
  return content.split(/\r?\n/)
    .map((line) => line.trim().split(/[=<>!~\[]/)[0].toLowerCase())
    .filter(Boolean);
}

function groupByCategory(frameworks) {
  return frameworks.reduce((groups, framework) => {
    if (!groups[framework.category]) groups[framework.category] = [];
    groups[framework.category].push(framework);
    return groups;
  }, {});
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { detectFrameworks };
