import { SESSION_COOKIE } from "../../../../lib/magic";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Cache-Control": "no-store",
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    },
  });
}
