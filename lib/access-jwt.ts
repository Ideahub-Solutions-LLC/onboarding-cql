// Verifies Cloudflare Access JWTs (RS256) using the team's published signing keys.
// Pure module: no Worker bindings, so it can be unit-tested with an injected fetch.
export type AccessIdentity = { userId: string; email: string; name: string | null };
export type VerifyOptions = {
  teamDomain: string;
  aud: string;
  fetchImpl?: typeof fetch;
  now?: number;
};

type Jwk = JsonWebKey & { kid?: string };
const keyCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const KEY_TTL_MS = 60 * 60 * 1000;
const REFETCH_COOLDOWN_MS = 60 * 1000;

const b64urlBytes = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

export function accessIssuer(teamDomain: string): string {
  const host = teamDomain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return `https://${host.includes(".") ? host : `${host}.cloudflareaccess.com`}`;
}

async function signingKeys(issuer: string, fetchImpl: typeof fetch, now: number, force: boolean) {
  const cached = keyCache.get(issuer);
  if (cached && now - cached.fetchedAt < KEY_TTL_MS && !(force && now - cached.fetchedAt > REFETCH_COOLDOWN_MS)) {
    return cached.keys;
  }
  const res = await fetchImpl(`${issuer}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("Unable to load Access signing keys");
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  keyCache.set(issuer, { keys, fetchedAt: now });
  return keys;
}

export function clearAccessKeyCache() {
  keyCache.clear();
}

// Returns the verified identity, or null for ANY failure (fail closed).
export async function verifyAccessJwt(
  token: string | null | undefined,
  { teamDomain, aud, fetchImpl = fetch, now = Date.now() }: VerifyOptions,
): Promise<AccessIdentity | null> {
  try {
    if (!token || !teamDomain || !aud) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = b64urlJson(parts[0]);
    const payload = b64urlJson(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

    const issuer = accessIssuer(teamDomain);
    let key = (await signingKeys(issuer, fetchImpl, now, false)).find((k) => k.kid === header.kid);
    if (!key) key = (await signingKeys(issuer, fetchImpl, now, true)).find((k) => k.kid === header.kid);
    if (!key) return null;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      b64urlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const seconds = Math.floor(now / 1000);
    const audiences: unknown[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return null;
    if (payload.iss !== issuer) return null;
    if (typeof payload.exp !== "number" || payload.exp <= seconds) return null;
    if (typeof payload.nbf === "number" && payload.nbf > seconds + 60) return null;
    // Service tokens carry no email; only people may use this app.
    if (typeof payload.email !== "string" || !payload.email.includes("@")) return null;

    const email = payload.email.toLowerCase();
    return {
      userId: typeof payload.sub === "string" && payload.sub ? payload.sub : email,
      email,
      name: typeof payload.name === "string" && payload.name ? payload.name : null,
    };
  } catch {
    return null;
  }
}
