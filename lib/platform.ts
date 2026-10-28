// SQLite/libSQL storage. Local development uses file:.data/cql.sqlite; hosted
// environments use a persistent libSQL URL.
export type Row = Record<string, any>;
export interface Stmt {
  bind(...v: any[]): Stmt;
  first<T = Row>(): Promise<T | null>;
  all<T = Row>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Db { prepare(sql: string): Stmt }
export interface Bucket {
  put(key: string, data: ArrayBuffer, opts?: unknown): Promise<unknown>;
  get(key: string): Promise<{ body: BodyInit } | null>;
  delete(key: string): Promise<void>;
}

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS applications (id text PRIMARY KEY NOT NULL, owner_id text NOT NULL, assigned_email text, data text NOT NULL, status text DEFAULT 'draft' NOT NULL, step integer DEFAULT 0 NOT NULL, checklist text DEFAULT '{}' NOT NULL, notes text DEFAULT '' NOT NULL, created_at text NOT NULL, updated_at text NOT NULL, submitted_at text, pricing_snapshot text)",
  "CREATE TABLE IF NOT EXISTS attachments (id text PRIMARY KEY NOT NULL, application_id text NOT NULL, name text NOT NULL, category text NOT NULL, size integer NOT NULL, type text NOT NULL, object_key text NOT NULL, created_at text NOT NULL)",
  "CREATE TABLE IF NOT EXISTS secrets (application_id text PRIMARY KEY NOT NULL, ciphertext text NOT NULL, updated_at text NOT NULL)",
  "CREATE TABLE IF NOT EXISTS settings (id text PRIMARY KEY NOT NULL, value text NOT NULL)",
  "CREATE TABLE IF NOT EXISTS blobs (key text PRIMARY KEY NOT NULL, data blob NOT NULL)",
  "CREATE TABLE IF NOT EXISTS users (email text PRIMARY KEY NOT NULL, password_hash text NOT NULL, created_at text NOT NULL, updated_at text NOT NULL)",
  "CREATE TABLE IF NOT EXISTS audit_events (id text PRIMARY KEY NOT NULL, actor_email text NOT NULL, action text NOT NULL, target_type text NOT NULL, target_id text, metadata text NOT NULL DEFAULT '{}', created_at text NOT NULL)",
  "CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at)",
];

const proc = process.env;
/** Runtime setting from the Node environment. */
export function setting(name: string): string | undefined {
  const v = proc[name];
  return typeof v === "string" && v.trim() ? v : undefined;
}

let nodeDb: Promise<Db> | undefined;
async function libsqlDb(): Promise<Db | null> {
  const url = setting("DATABASE_URL");
  if (!url) return null;
  nodeDb ??= (async () => {
    const authToken = setting("DATABASE_AUTH_TOKEN");
    let client: any;
    if (url.startsWith("file:")) {
      // Local-only convenience; resolved at runtime so it is never bundled for Workers/Vercel.
      const mod = "@libsql/client";
      client = (await import(/* webpackIgnore: true */ /* @vite-ignore */ mod)).createClient({ url });
    } else {
      client = (await import("@libsql/client/web")).createClient({ url, authToken });
    }
    await client.batch(SCHEMA, "write");
    const make = (sql: string, args: any[] = []): Stmt => ({
      bind: (...v) => make(sql, v),
      first: async <T,>() => ((await client.execute({ sql, args })).rows[0] as T) ?? null,
      all: async <T,>() => ({ results: (await client.execute({ sql, args })).rows as unknown as T[] }),
      run: async () => ({ meta: { changes: (await client.execute({ sql, args })).rowsAffected } }),
    });
    return { prepare: (sql: string) => make(sql) };
  })();
  nodeDb.catch(() => { nodeDb = undefined; });
  return nodeDb;
}

export async function getDatabase(): Promise<Db | null> {
  return libsqlDb();
}

export async function getBucket(): Promise<Bucket | null> {
  const db = await libsqlDb();
  if (!db) return null;
  return {
    async put(key, data) {
      await db.prepare("INSERT OR REPLACE INTO blobs (key,data) VALUES (?,?)").bind(key, new Uint8Array(data)).run();
    },
    async get(key) {
      const row: any = await db.prepare("SELECT data FROM blobs WHERE key=?").bind(key).first();
      if (!row) return null;
      const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : new Uint8Array(row.data);
      return { body: bytes };
    },
    async delete(key) {
      await db.prepare("DELETE FROM blobs WHERE key=?").bind(key).run();
    },
  };
}
