import { getDatabase, setting } from "../../../../lib/platform";
import { signToken, LOGIN_TTL } from "../../../../lib/magic";
import { signInMode } from "../../../auth";
import { sameOrigin } from "../../../../lib/origin";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (signInMode() !== "magic") return json({ error: "Email sign-in is not enabled." }, 404);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);

  let email = "";
  try {
    email = String(((await req.json()) as { email?: unknown })?.email ?? "").trim().toLowerCase();
  } catch {
    // handled by validation below
  }
  if (!EMAIL.test(email) || email.length > 200) return json({ error: "Enter a valid email address." }, 400);

  const key = setting("RESEND_API_KEY");
  if (!key && process.env.NODE_ENV === "production") return json({ error: "Email delivery is not configured." }, 503);

  // One link per address per minute, so a client's inbox can't be flooded.
  const db = await getDatabase();
  if (!db) return json({ error: "Storage is not configured." }, 503);
  const id = "throttle:" + email;
  const now = Date.now();
  const prev: any = await db.prepare("SELECT value FROM settings WHERE id=?").bind(id).first();
  if (prev && now - Number(prev.value) < 60_000) return json({ ok: true, throttled: true });
  await db.prepare("INSERT OR REPLACE INTO settings (id,value) VALUES (?,?)").bind(id, String(now)).run();

  const token = await signToken(setting("AUTH_SECRET")!, "login", email, LOGIN_TTL);
  const link = `${req.headers.get("origin")}/api/auth/verify?token=${encodeURIComponent(token)}`;
  if (!key) {
    // Without a mail provider the link is returned only outside production, so local runs work.
    console.log(`[dev] sign-in link for ${email}: ${link}`);
    return json({ ok: true, devLink: link });
  }
  const from = setting("MAIL_FROM") ?? "CQL Launchpad <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your CQL Launchpad sign-in link",
      text: `Use this link to sign in. It expires in 15 minutes.\n\n${link}\n\nIf you did not request it, ignore this email.`,
    }),
  });
  if (!res.ok) return json({ error: "We couldn't send the email. Please try again." }, 502);
  return json({ ok: true });
}
