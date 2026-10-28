// Stateless signed tokens for email magic-link sign-in (HMAC-SHA256, WebCrypto only).
const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const c of u) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export type TokenKind = "login" | "session";

export async function signToken(secret: string, kind: TokenKind, email: string, ttlSeconds: number, now = Date.now()) {
  const body = b64u(enc.encode(JSON.stringify({ k: kind, e: email.toLowerCase(), x: Math.floor(now / 1000) + ttlSeconds })));
  const sig = b64u(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(body)));
  return `${body}.${sig}`;
}

export async function verifyToken(
  secret: string | undefined,
  kind: TokenKind,
  token: string | null | undefined,
  now = Date.now(),
): Promise<string | null> {
  if (!secret || secret.length < 16 || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64u(parts[1]), enc.encode(parts[0]));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(parts[0])));
    if (p.k !== kind || typeof p.e !== "string" || typeof p.x !== "number" || p.x < Math.floor(now / 1000)) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.e) ? p.e : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "cql_session";
export const LOGIN_TTL = 15 * 60;
export const SESSION_TTL = 7 * 24 * 60 * 60;
