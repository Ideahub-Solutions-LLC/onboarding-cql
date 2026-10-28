const required = ['AUTH_SECRET', 'VAULT_KEY', 'OWNER_EMAILS', 'ADMIN_PASSWORD'];
const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.TURSO_DATABASE_URL?.trim();
const shouldValidate = process.env.VERCEL === '1' || process.env.CQL_VALIDATE_ENV === '1';
if (shouldValidate) {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (!databaseUrl) missing.push('DATABASE_URL or TURSO_DATABASE_URL');
  if (
    databaseUrl?.startsWith('libsql:') &&
    !process.env.DATABASE_AUTH_TOKEN?.trim() &&
    !process.env.TURSO_AUTH_TOKEN?.trim()
  ) {
    missing.push('DATABASE_AUTH_TOKEN or TURSO_AUTH_TOKEN');
  }
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) missing.push('AUTH_SECRET (must be at least 32 characters)');
  if (missing.length) {
    console.error(`Vercel runtime configuration is incomplete: ${[...new Set(missing)].join(', ')}`);
    process.exit(1);
  }
}
