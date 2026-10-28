// Test sign-in: a minted session cookie when AUTH_SECRET is set (magic-link / Vercel build),
// otherwise synthetic identity headers (local Cloudflare preview with ALLOW_TEST_HEADERS=1).
import { signToken, SESSION_COOKIE } from '../lib/magic.ts';
export const base = process.env.TEST_BASE || 'http://127.0.0.1:8787';
export async function authHeaders(userId, email) {
  const secret = process.env.AUTH_SECRET;
  if (secret) return { Cookie: `${SESSION_COOKIE}=${await signToken(secret, 'session', email, 3600)}` };
  return { 'oai-authenticated-user-id': userId, 'oai-authenticated-user-email': email };
}
