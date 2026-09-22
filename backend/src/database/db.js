const Database = require('better-sqlite3');
const path = require('path');

let db;

function initializeDatabase() {
  const configuredPath = process.env.DATABASE_PATH || process.env.DATABASE_URL;
  if (configuredPath && /^postgres(?:ql)?:\/\//i.test(configuredPath)) {
    throw new Error('This Aegis build uses SQLite. Set DATABASE_PATH to a filesystem path instead of a PostgreSQL URL.');
  }
  const dbPath = configuredPath || path.join(__dirname, '..', '..', 'data', 'aegis.db');
  
  // Ensure the data directory exists
  const fs = require('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      UNIQUE(owner, repo)
    );

    CREATE INDEX IF NOT EXISTS idx_cache_lookup ON analysis_cache(owner, repo);
    CREATE INDEX IF NOT EXISTS idx_cache_expiry ON analysis_cache(expires_at);
  `);

  // Clean expired entries on startup
  db.prepare(`DELETE FROM analysis_cache WHERE expires_at < ?`).run(new Date().toISOString());

  console.log('Database initialized');
  return db;
}

function getAnalysisCache(owner, repo) {
  if (!db) return null;
  const row = db.prepare(
    `SELECT result FROM analysis_cache WHERE owner = ? AND repo = ? AND expires_at > ?`
  ).get(owner.toLowerCase(), repo.toLowerCase(), new Date().toISOString());
  if (!row) return null;
  try {
    return JSON.parse(row.result);
  } catch {
    db.prepare(`DELETE FROM analysis_cache WHERE owner = ? AND repo = ?`).run(owner.toLowerCase(), repo.toLowerCase());
    return null;
  }
}

function setAnalysisCache(owner, repo, result) {
  if (!db) return;
  const ttl = parseInt(process.env.CACHE_TTL_MINUTES) || 30;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO analysis_cache (owner, repo, result, expires_at) VALUES (?, ?, ?, ?)`
  ).run(owner.toLowerCase(), repo.toLowerCase(), JSON.stringify(result), expiresAt);
}

function clearCache() {
  if (!db) return;
  db.prepare('DELETE FROM analysis_cache').run();
}

module.exports = { initializeDatabase, getAnalysisCache, setAnalysisCache, clearCache };
