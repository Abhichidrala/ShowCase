const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'career_showcase.db');

const db = new sqlite3.Database(DB_PATH);

// --- Promise Wrapper functions ---
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row || null);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows || []);
  });
});

// --- Initialize Database Schema ---
async function initDb() {
  await dbRun('PRAGMA foreign_keys = ON;');
  await dbRun('PRAGMA journal_mode = WAL;');
  await dbRun('PRAGMA synchronous = NORMAL;');
  
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Split statements by semicolon, avoiding issues inside text blocks
  // Since our schema.sql is clean and doesn't use semicolons inside quotes, standard splitting is fine
  const statements = schemaSql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
    
  for (const statement of statements) {
    await dbRun(statement);
  }

}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDb
};
