import assert from 'node:assert/strict';
import { base } from './auth-helper.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; console.log('PASS ' + message); };

async function login(password) {
  const response = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: process.env.TEST_OWNER_EMAIL || 'admin@corequantumleads.com', password }),
  });
  return { response, data: await response.json() };
}

const denied = await login('incorrect-password');
check(denied.response.status === 401, 'incorrect password is rejected');

const accepted = await login(process.env.ADMIN_PASSWORD);
const cookie = accepted.response.headers.get('set-cookie');
check(accepted.response.status === 200 && cookie?.includes('cql_session='), 'owner password creates a session');

const session = await fetch(base + '/api/session', { headers: { Cookie: cookie.split(';')[0] } });
const sessionData = await session.json();
check(session.status === 200 && sessionData.signIn === 'password' && sessionData.admin, 'password session opens the owner workspace');

const logout = await fetch(base + '/api/auth/logout', { headers: { Cookie: cookie.split(';')[0] }, redirect: 'manual' });
check(logout.status === 302 && logout.headers.get('set-cookie')?.includes('Max-Age=0'), 'sign-out clears the session cookie');

console.log(`${checks} password-auth API checks passed.`);
