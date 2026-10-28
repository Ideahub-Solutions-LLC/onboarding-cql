import assert from 'node:assert/strict';
import { verifyAccessJwt, accessIssuer, clearAccessKeyCache } from '../lib/access-jwt.ts';

let count = 0;
const check = async (name, f) => { clearAccessKeyCache(); await f(); console.log('PASS ' + name); count++; };

const TEAM = 'cqlteam.cloudflareaccess.com';
const ISS = 'https://' + TEAM;
const AUD = 'aud-tag-123';
const NOW = 1_800_000_000_000;
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const gen = () => crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const good = await gen();
const other = await gen();
const jwk = { ...(await crypto.subtle.exportKey('jwk', good.publicKey)), kid: 'k1' };

async function sign(payload, { key = good.privateKey, kid = 'k1', alg = 'RS256' } = {}) {
  const h = b64u(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const p = b64u(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p));
  return `${h}.${p}.${b64u(sig)}`;
}
const claims = (o = {}) => ({ aud: [AUD], iss: ISS, email: 'Owner@Example.com', sub: 'user-1', name: 'Owner', exp: NOW / 1000 + 600, nbf: NOW / 1000 - 10, ...o });
let fetches = 0;
const fetchImpl = async (url) => { fetches++; assert.equal(url, ISS + '/cdn-cgi/access/certs'); return Response.json({ keys: [jwk] }); };
const verify = (token) => verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, fetchImpl, now: NOW });

await check('valid token returns a lowercased verified identity', async () => {
  const id = await verify(await sign(claims()));
  assert.deepEqual(id, { userId: 'user-1', email: 'owner@example.com', name: 'Owner' });
});
await check('team domain forms normalize to one issuer', () => {
  assert.equal(accessIssuer('cqlteam'), ISS);
  assert.equal(accessIssuer('https://cqlteam.cloudflareaccess.com/'), ISS);
});
await check('missing, malformed, and empty tokens are rejected', async () => {
  for (const t of [null, undefined, '', 'abc', 'a.b', 'a.b.c.d']) assert.equal(await verify(t), null);
});
await check('wrong audience is rejected', async () => assert.equal(await verify(await sign(claims({ aud: ['other'] }))), null));
await check('wrong issuer is rejected', async () => assert.equal(await verify(await sign(claims({ iss: 'https://evil.cloudflareaccess.com' }))), null));
await check('expired token is rejected', async () => assert.equal(await verify(await sign(claims({ exp: NOW / 1000 - 1 }))), null));
await check('not-yet-valid token is rejected', async () => assert.equal(await verify(await sign(claims({ nbf: NOW / 1000 + 3600 }))), null));
await check('signature from a different key is rejected', async () => assert.equal(await verify(await sign(claims(), { key: other.privateKey })), null));
await check('tampered payload is rejected', async () => {
  const t = await sign(claims());
  const [h, , s] = t.split('.');
  assert.equal(await verify(`${h}.${b64u(JSON.stringify(claims({ email: 'attacker@example.com' })))}.${s}`), null);
});
await check('non-RS256 algorithms are rejected', async () => assert.equal(await verify(await sign(claims(), { alg: 'none' })), null));
await check('unknown key id is rejected', async () => assert.equal(await verify(await sign(claims(), { kid: 'nope' })), null));
await check('service tokens without an email are rejected', async () => assert.equal(await verify(await sign(claims({ email: undefined }))), null));
await check('missing configuration fails closed', async () => {
  const t = await sign(claims());
  assert.equal(await verifyAccessJwt(t, { teamDomain: '', aud: AUD, fetchImpl, now: NOW }), null);
  assert.equal(await verifyAccessJwt(t, { teamDomain: TEAM, aud: '', fetchImpl, now: NOW }), null);
});
await check('signing keys are cached between requests', async () => {
  fetches = 0;
  const t = await sign(claims());
  await verify(t); await verify(t);
  assert.equal(fetches, 1);
});
await check('key endpoint failure fails closed', async () => {
  const down = async () => new Response('no', { status: 500 });
  assert.equal(await verifyAccessJwt(await sign(claims()), { teamDomain: TEAM, aud: AUD, fetchImpl: down, now: NOW }), null);
});

console.log(count + ' Access JWT checks passed.');
