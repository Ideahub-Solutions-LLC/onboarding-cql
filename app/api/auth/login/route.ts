import { getDatabase, setting } from "../../../../lib/platform";
import { signToken, SESSION_COOKIE, SESSION_TTL } from "../../../../lib/magic";
import { consumeLoginRateLimit } from "../../../../lib/login-policy";
import { safePasswordMatch, verifyPassword } from "../../../../lib/password";
import { sameOrigin } from "../../../../lib/origin";
import { writeAudit } from "../../../../lib/audit";
import { ownerEmails } from "../../../auth";

export const dynamic = "force-dynamic";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
  if (!sameOrigin(req)) return reply({ error: "Invalid request origin." }, 403);
  const secret = setting("AUTH_SECRET");
  const db = await getDatabase();
  if (!secret || !db) return reply({ error: "Sign-in is not configured." }, 503);

  let body: { email?: unknown; password?: unknown } = {};
  try { body = await req.json(); } catch { /* validation below */ }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!EMAIL.test(email) || email.length > 200 || !password || password.length > 200) return reply({ error: "Invalid email or password." }, 401);

  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
  if (!await consumeLoginRateLimit(db, email, ip)) return reply({ error: "Too many sign-in attempts. Try again later." }, 429);

  const owner = ownerEmails().includes(email);
  const user = owner ? null : await db.prepare("SELECT password_hash FROM users WHERE email=?").bind(email).first<{ password_hash: string }>();
  const valid = owner
    ? await safePasswordMatch(password, setting("ADMIN_PASSWORD"))
    : await verifyPassword(password, user?.password_hash);
  if (!valid) {
    await writeAudit(db, email, "auth.login_failed", "user", email, { ip });
    return reply({ error: "Invalid email or password." }, 401);
  }

  const session = await signToken(secret, "session", email, SESSION_TTL);
  await writeAudit(db, email, "auth.login_succeeded", "user", email, { ip });
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure}`,
    },
  });
}
