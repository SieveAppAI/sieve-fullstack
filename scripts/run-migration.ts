/**
 * Run a SQL migration file against Supabase.
 * Usage: npx tsx scripts/run-migration.ts supabase/migrations/00005_add_rls_policies.sql
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
);

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx scripts/run-migration.ts <path-to-sql>');
  process.exit(1);
}

const sql = readFileSync(filePath, 'utf-8');

// Split into individual statements (handle multiline CREATE POLICY etc.)
const statements: string[] = [];
let current = '';
for (const line of sql.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--') && current === '') continue;
  current += line + '\n';
  if (trimmed.endsWith(';')) {
    const stmt = current.trim();
    if (stmt && stmt !== ';') {
      statements.push(stmt);
    }
    current = '';
  }
}

console.log(`Running ${statements.length} statements from ${filePath}`);

async function run() {
  let ok = 0;
  let failed = 0;

  for (const stmt of statements) {
    const preview = stmt.split('\n').find((l) => l.trim() && !l.trim().startsWith('--'))?.trim() ?? '';
    process.stdout.write(`  ${preview.substring(0, 70)}... `);

    // Use the Supabase SQL execution via REST
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()}/rest/v1/rpc/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()}`,
          Prefer: 'return=minimal',
        },
        body: stmt,
      }
    );

    // The REST API doesn't support raw SQL. Use the pg endpoint instead.
    // Supabase exposes a SQL query endpoint for service role.
    const sqlResp = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()}/pg`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()}`,
        },
        body: JSON.stringify({ query: stmt }),
      }
    );

    if (sqlResp.ok) {
      console.log('OK');
      ok++;
    } else {
      const text = await sqlResp.text();
      if (text.includes('already exists')) {
        console.log('SKIP (already exists)');
        ok++;
      } else {
        console.log(`FAIL: ${text.substring(0, 100)}`);
        failed++;
      }
    }
  }

  console.log(`\nDone: ${ok} OK, ${failed} failed`);
}

run().catch(console.error);
