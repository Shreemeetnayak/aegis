const { getContentsByBasename, parseJson } = require('../../utils/contentUtils');

const NPM_DATABASES = {
  pg: 'PostgreSQL', 'pg-promise': 'PostgreSQL', mysql: 'MySQL', mysql2: 'MySQL', mongodb: 'MongoDB',
  mongoose: 'MongoDB', sqlite3: 'SQLite', 'better-sqlite3': 'SQLite', redis: 'Redis', ioredis: 'Redis',
  firebase: 'Firebase', 'firebase-admin': 'Firebase', '@supabase/supabase-js': 'Supabase',
  '@prisma/client': 'Prisma ORM', prisma: 'Prisma ORM', typeorm: 'TypeORM', sequelize: 'Sequelize ORM',
  knex: 'Knex.js', 'drizzle-orm': 'Drizzle ORM', 'neo4j-driver': 'Neo4j', mssql: 'SQL Server',
  '@elastic/elasticsearch': 'Elasticsearch',
};

const PYTHON_DATABASES = {
  psycopg2: 'PostgreSQL', asyncpg: 'PostgreSQL', pymongo: 'MongoDB', motor: 'MongoDB',
  mysqlclient: 'MySQL', pymysql: 'MySQL', redis: 'Redis', aioredis: 'Redis', firebase_admin: 'Firebase',
  sqlalchemy: 'SQLAlchemy', peewee: 'Peewee ORM', 'tortoise-orm': 'Tortoise ORM',
};

function detectDatabases(fileContents) {
  const found = new Map();
  const add = (name, confidence, evidence) => {
    const current = found.get(name);
    if (current) {
      current.evidence.push(evidence);
      if (confidence === 'detected') current.confidence = 'detected';
    } else {
      found.set(name, { name, confidence, evidence: [evidence] });
    }
  };

  for (const { path, content } of getContentsByBasename(fileContents, 'package.json')) {
    const packageJson = parseJson(content);
    const dependencies = packageJson ? { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) } : {};
    for (const [dependency, name] of Object.entries(NPM_DATABASES)) {
      if (dependencies[dependency]) add(name, 'detected', `${dependency} in ${path}`);
    }
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'requirements.txt')) {
    const names = content.split(/\r?\n/).map((line) => line.trim().split(/[=<>!~\[]/)[0].toLowerCase());
    for (const [dependency, name] of Object.entries(PYTHON_DATABASES)) {
      if (names.includes(dependency)) add(name, 'detected', `${dependency} in ${path}`);
    }
  }

  for (const { path, content } of getEnvironmentExamples(fileContents)) addEnvironmentSignals(content, path, add);
  for (const { path, content } of getComposeFiles(fileContents)) {
    if (/image:\s*['"]?(?:postgres|postgis)/i.test(content)) add('PostgreSQL', 'detected', `PostgreSQL image in ${path}`);
    if (/image:\s*['"]?(?:mysql|mariadb)/i.test(content)) add(/mariadb/i.test(content) ? 'MariaDB' : 'MySQL', 'detected', `Database image in ${path}`);
    if (/image:\s*['"]?mongo/i.test(content)) add('MongoDB', 'detected', `MongoDB image in ${path}`);
    if (/image:\s*['"]?redis/i.test(content)) add('Redis', 'detected', `Redis image in ${path}`);
  }
  for (const { path, content } of getContentsByBasename(fileContents, 'schema.prisma')) {
    const provider = content.match(/provider\s*=\s*["']([^"']+)["']/i);
    const map = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite', mongodb: 'MongoDB', sqlserver: 'SQL Server' };
    if (provider && map[provider[1].toLowerCase()]) add(map[provider[1].toLowerCase()], 'detected', `Prisma provider in ${path}`);
  }

  return { databases: [...found.values()], count: found.size, hasDatabase: found.size > 0 };
}

function getEnvironmentExamples(fileContents) {
  return Object.entries(fileContents || {}).filter(([path]) => /^\.env\.(example|sample|template|development)$/i.test(path.split('/').pop())).map(([path, content]) => ({ path, content }));
}

function getComposeFiles(fileContents) {
  return Object.entries(fileContents || {}).filter(([path]) => /^(docker-compose|compose)\.ya?ml$/i.test(path.split('/').pop())).map(([path, content]) => ({ path, content }));
}

function addEnvironmentSignals(content, path, add) {
  const patterns = [
    [/\b(?:POSTGRES|PGHOST|PGDATABASE)\b/i, 'PostgreSQL'], [/\bMYSQL\b/i, 'MySQL'],
    [/\b(?:MONGO_URI|MONGODB_URI|MONGO_URL)\b/i, 'MongoDB'], [/\b(?:REDIS_URL|REDIS_HOST)\b/i, 'Redis'],
    [/\bSUPABASE\b/i, 'Supabase'], [/\bFIREBASE\b/i, 'Firebase'],
    [/\b(?:DATABASE_URL|DB_HOST|DB_NAME)\b/i, 'Relational Database'],
  ];
  for (const [pattern, name] of patterns) if (pattern.test(content)) add(name, 'likely', `Referenced in ${path}`);
}

module.exports = { detectDatabases };
