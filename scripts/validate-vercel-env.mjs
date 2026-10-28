const required = ['DATABASE_URL', 'AUTH_SECRET', 'VAULT_KEY', 'OWNER_EMAILS', 'ADMIN_PASSWORD'];
if (process.env.DATABASE_URL?.startsWith('libsql:')) required.push('DATABASE_AUTH_TOKEN');
const shouldValidate = process.env.VERCEL === '1' || process.env.CQL_VALIDATE_ENV === '1';
if (shouldValidate) {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) missing.push('AUTH_SECRET (must be at least 32 characters)');
  if (missing.length) {
    console.error(`Vercel runtime configuration is incomplete: ${[...new Set(missing)].join(', ')}`);
    process.exit(1);
  }
}
