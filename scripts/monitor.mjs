const base = (process.env.MONITOR_URL || 'https://onboarding.corequantumleads.com').replace(/\/$/, '');
const timeout = Number(process.env.MONITOR_TIMEOUT_MS || 10_000);
for (const path of ['/', '/api/health']) {
  const started = Date.now();
  const res = await fetch(base + path, { signal: AbortSignal.timeout(timeout), redirect: 'manual' });
  const elapsed = Date.now() - started;
  console.log(`${res.ok ? 'PASS' : 'FAIL'} ${path} ${res.status} ${elapsed}ms`);
  if (!res.ok) process.exitCode = 1;
}
