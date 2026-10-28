// Test sign-in uses a minted application session cookie.
import { signToken, SESSION_COOKIE } from '../lib/magic.ts';
export const base = process.env.TEST_BASE || 'http://127.0.0.1:8787';
export async function authHeaders(userId, email) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error(`AUTH_SECRET is required for test identity ${userId}`);
  return { Cookie: `${SESSION_COOKIE}=${await signToken(secret, 'session', email, 3600)}` };
}
