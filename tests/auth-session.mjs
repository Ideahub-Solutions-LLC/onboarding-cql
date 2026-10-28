import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../lib/magic.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';

const secret = 'a-long-test-secret-value-1234567890';
const now = Date.UTC(2026, 9, 29);
let checks = 0;
const check = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };

await check('session token returns normalized email', async () => {
  const token = await signToken(secret, 'session', 'Owner@Example.com', 3600, now);
  assert.equal(await verifyToken(secret, 'session', token, now + 1000), 'owner@example.com');
});
await check('expired and tampered sessions are rejected', async () => {
  const token = await signToken(secret, 'session', 'owner@example.com', 1, now);
  assert.equal(await verifyToken(secret, 'session', token, now + 2000), null);
  assert.equal(await verifyToken(secret, 'session', token + 'x', now), null);
});
await check('password hashes verify without storing plaintext', async () => {
  const hash = await hashPassword('A-strong-test-password!');
  assert.ok(!hash.includes('A-strong-test-password!'));
  assert.equal(await verifyPassword('A-strong-test-password!', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});
console.log(`${checks} session/password checks passed.`);
