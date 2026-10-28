import { setting } from "../../../../lib/platform";
import { verifyToken, signToken, SESSION_COOKIE, SESSION_TTL } from "../../../../lib/magic";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = setting("AUTH_SECRET");
  const email = await verifyToken(secret, "login", url.searchParams.get("token"));
  if (!email) return new Response(null, { status: 302, headers: { Location: "/?signin=expired", "Cache-Control": "no-store" } });
  const session = await signToken(secret!, "session", email, SESSION_TTL);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Cache-Control": "no-store",
      "Set-Cookie": `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure}`,
    },
  });
}
