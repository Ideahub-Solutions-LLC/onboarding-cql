import type { Db } from "./platform";

type WindowValue = { start: number; count: number };

async function consumeWindow(db: Db, key: string, limit: number, windowMs: number, now = Date.now()) {
  const row = await db.prepare("SELECT value FROM settings WHERE id=?").bind(key).first<{ value: string }>();
  let value: WindowValue = { start: now, count: 0 };
  try { if (row) value = JSON.parse(row.value); } catch { /* reset malformed throttle state */ }
  if (!Number.isFinite(value.start) || now - value.start >= windowMs) value = { start: now, count: 0 };
  if (value.count >= limit) return false;
  value.count += 1;
  await db.prepare("INSERT OR REPLACE INTO settings (id,value) VALUES (?,?)").bind(key, JSON.stringify(value)).run();
  return true;
}

export async function consumeLoginRateLimit(db: Db, email: string, ip: string) {
  const emailOk = await consumeWindow(db, `login-email:${email.toLowerCase()}`, 5, 15 * 60_000);
  const ipOk = await consumeWindow(db, `login-ip:${ip}`, 20, 15 * 60_000);
  return emailOk && ipOk;
}
