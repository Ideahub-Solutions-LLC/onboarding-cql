// Unit checks for the stateless sign-in tokens used on the Vercel target.
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../lib/magic.ts';
let n = 0; const check = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const S = 'a-long-test-secret-value-1234567890';
const now = Date.UTC(2026, 9, 28);
await check('valid login token returns lowercased email', async () => assert.equal(await verifyToken(S, 'login', await signToken(S, 'login', 'Client@Example.com', 900, now), now + 1000), 'client@example.com'));
await check('login token cannot be used as a session', async () => assert.equal(await verifyToken(S, 'session', await signToken(S, 'login', 'a@b.co', 900, now), now), null));
await check('expired token rejected', async () => assert.equal(await verifyToken(S, 'login', await signToken(S, 'login', 'a@b.co', 900, now), now + 901_000), null));
await check('wrong secret rejected', async () => assert.equal(await verifyToken('another-long-secret-value-123456', 'login', await signToken(S, 'login', 'a@b.co', 900, now), now), null));
await check('tampered email rejected', async () => {
  const t = await signToken(S, 'login', 'a@b.co', 900, now); const [b, s] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ k: 'login', e: 'owner@b.co', x: 9999999999 })).toString('base64url');
  assert.equal(await verifyToken(S, 'login', forged + '.' + s, now), null); assert.ok(b);
});
await check('missing, malformed, or weak-secret input rejected', async () => {
  assert.equal(await verifyToken(S, 'login', undefined, now), null); assert.equal(await verifyToken(S, 'login', 'x', now), null);
  assert.equal(await verifyToken('short', 'login', await signToken('short', 'login', 'a@b.co', 900, now), now), null);
});
console.log(n + ' magic-link checks passed.');
