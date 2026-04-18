import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log('Running database migrations...');

  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot run migrations: database not available');
    process.exit(1);
  }

  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already-run migrations
  const { rows: executed } = await query('SELECT filename FROM migrations ORDER BY filename');
  const executedSet = new Set(executed.map(r => r.filename));

  // Read migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (executedSet.has(file)) {
      console.log(`  Skip: ${file} (already executed)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await query(sql);
      await query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      console.log(`  Done: ${file}`);
      count++;
    } catch (err) {
      console.error(`  FAILED: ${file} — ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`Migrations complete. ${count} new migration(s) applied.`);
  process.exit(0);
}

runMigrations();
