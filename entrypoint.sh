#!/bin/sh
set -e

echo "==> Running database migrations..."
node -e "
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const migrationDir = path.join(process.cwd(), 'drizzle');
  if (!fs.existsSync(migrationDir)) {
    console.log('No drizzle/ directory found, skipping');
    return;
  }

  const sqlFiles = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    console.log('No SQL files found');
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    try {
      await client.query(sql);
      console.log('✓ ' + file);
    } catch (e) {
      // idempotent errors (column exists, index exists) are OK
      const msg = e.message || '';
      if (msg.includes('already exists') || msg.includes('does not exist') || msg.includes('IF NOT EXISTS')) {
        console.log('⚠ ' + file + ' (skipped): ' + msg.slice(0, 80));
      } else {
        console.log('⚠ ' + file + ': ' + msg.slice(0, 80));
      }
    }
  }

  await client.end();
  console.log('==> Migrations done');
}

run().catch(e => { console.error('Migration error:', e.message); process.exit(0); });
" 2>&1 || true

echo "==> Starting application..."
exec node server.js
