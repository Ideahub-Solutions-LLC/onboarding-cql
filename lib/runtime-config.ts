import { setting } from "./platform";

const REQUIRED_VERCEL_SETTINGS = [
  "AUTH_SECRET",
  "VAULT_KEY",
  "OWNER_EMAILS",
  "ADMIN_PASSWORD",
] as const;

export function runtimeReadiness() {
  const missing = REQUIRED_VERCEL_SETTINGS.filter((name) => !setting(name));
  const databaseUrl = setting("DATABASE_URL") ?? setting("TURSO_DATABASE_URL") ?? "";
  if (!databaseUrl) missing.push("DATABASE_URL or TURSO_DATABASE_URL" as never);
  if (
    databaseUrl.startsWith("libsql:") &&
    !setting("DATABASE_AUTH_TOKEN") &&
    !setting("TURSO_AUTH_TOKEN")
  ) {
    missing.push("DATABASE_AUTH_TOKEN or TURSO_AUTH_TOKEN" as never);
  }
  if ((setting("AUTH_SECRET")?.length ?? 0) < 32 && !missing.includes("AUTH_SECRET")) missing.push("AUTH_SECRET");
  return { ready: missing.length === 0, missing: [...new Set(missing)] };
}

