import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

const migrationsDir = new URL('../migrations/', import.meta.url);
const placeholders = sql => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

export async function createDatabase({ url, poolSize = 10 } = {}) {
  if (!url) throw new Error('DATABASE_URL is required. Batra Connect uses PostgreSQL.');
  const pool = new pg.Pool({
    connectionString: url,
    max: poolSize,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
  const query = async (sql, values = []) => (await pool.query(placeholders(sql), values)).rows;
  const transaction = async fn => {
    for (let attempt = 0; ; attempt++) {
      const client = await pool.connect();
      const tx = async (sql, values = []) => (await client.query(placeholders(sql), values)).rows;
      try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        if (!['40001', '40P01'].includes(e.code) || attempt >= 4) throw e;
        await new Promise(r => setTimeout(r, 20 * (attempt + 1) + Math.random() * 30));
      } finally {
        client.release();
      }
    }
  };
  await migrate(pool);
  return { query, transaction, close: () => pool.end(), engine: 'postgresql', pool };
}

/**
 * Supabase publishes tables to its "anon" and "authenticated" roles through its Data API. All data must go through
 * this API, so every table has row-level security on with no policies (those roles see nothing; the API connects as
 * the table owner, which RLS does not restrict) and those roles hold no table privileges. It runs after migrations
 * on every start, so tables added later are covered too. On plain PostgreSQL the roles do not exist; only RLS applies.
 */
const PRIVATE_TABLES = `DO $$
DECLARE t record; r record;
BEGIN
  FOR t IN SELECT relname FROM pg_class
    WHERE relnamespace = current_schema()::regnamespace AND relkind = 'r' AND NOT relrowsecurity LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    IF EXISTS (SELECT 1 FROM information_schema.role_table_grants
               WHERE grantee = r.rolname AND table_schema = current_schema()) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM %I', current_schema(), r.rolname);
    END IF;
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE ALL ON TABLES FROM %I', current_schema(), r.rolname);
  END LOOP;
END $$`;

/**
 * Applies each numbered migration once, in order, in one transaction. The lock is transaction-scoped so it also
 * works through connection poolers (Supabase session or transaction mode), and replicas can start together.
 */
async function migrate(pool) {
  const files = (await readdir(migrationsDir)).filter(f => /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(673104)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
    );
    const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      try {
        await client.query(await readFile(new URL(file, migrationsDir), 'utf8'));
      } catch (e) {
        e.message = `Migration ${file} failed: ${e.message}`;
        throw e;
      }
      await client.query('INSERT INTO schema_migrations(name,applied_at) VALUES($1,$2)', [
        file,
        new Date().toISOString(),
      ]);
    }
    await client.query(PRIVATE_TABLES);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
