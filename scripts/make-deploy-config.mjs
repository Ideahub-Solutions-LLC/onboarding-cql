// Derives the production Wrangler config from the freshly built dist/server/wrangler.json.
// Values come from environment variables (see deploy.env.example); nothing secret belongs here.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../dist/server/wrangler.json", import.meta.url));
const out = fileURLToPath(new URL("../dist/server/wrangler.deploy.json", import.meta.url));
const e = process.env;

const required = ["D1_DATABASE_ID", "CUSTOM_DOMAIN", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "OWNER_EMAILS"];
const missing = required.filter((k) => !e[k]?.trim());
if (missing.length) {
  console.error(`Missing required settings: ${missing.join(", ")}\nCopy deploy.env.example to .env.deploy and fill it in.`);
  process.exit(1);
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.D1_DATABASE_ID) || /^0{8}-/.test(e.D1_DATABASE_ID)) {
  console.error("D1_DATABASE_ID must be the real database ID returned by `wrangler d1 create`.");
  process.exit(1);
}
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(e.CUSTOM_DOMAIN)) {
  console.error("CUSTOM_DOMAIN must be a hostname such as onboarding.example.com (no https://).");
  process.exit(1);
}
const owners = e.OWNER_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
if (!owners.length || owners.some((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) {
  console.error("OWNER_EMAILS must be a comma-separated list of valid email addresses.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(src, "utf8"));
const name = e.WORKER_NAME?.trim() || "cql-onboarding";
config.name = name;
config.topLevelName = name;
delete config.dev; // local-only settings
config.workers_dev = false; // no unauthenticated *.workers.dev origin
config.preview_urls = false; // no unauthenticated preview origins
config.routes = [{ pattern: e.CUSTOM_DOMAIN, custom_domain: true }];
config.vars = {
  OWNER_EMAILS: owners.join(","),
  CF_ACCESS_TEAM_DOMAIN: e.CF_ACCESS_TEAM_DOMAIN.trim(),
  CF_ACCESS_AUD: e.CF_ACCESS_AUD.trim(),
};
config.d1_databases = [{
  binding: "DB",
  database_name: e.D1_NAME?.trim() || "cql-onboarding-production",
  database_id: e.D1_DATABASE_ID,
  migrations_dir: "../../drizzle",
}];
config.r2_buckets = [{ binding: "BUCKET", bucket_name: e.R2_BUCKET?.trim() || "cql-onboarding-private" }];

writeFileSync(out, JSON.stringify(config, null, 2) + "\n");
console.log(`Wrote dist/server/wrangler.deploy.json for ${e.CUSTOM_DOMAIN} (worker "${name}").`);
console.log("VAULT_KEY is a secret: set it once with `npm run deploy:secret`.");
