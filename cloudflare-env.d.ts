declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    VAULT_KEY?: string;
    OWNER_EMAILS?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
    ALLOW_TEST_HEADERS?: string;
  }
}
