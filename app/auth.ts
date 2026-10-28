import { cookies, headers } from "next/headers";
import { verifyAccessJwt } from "../lib/access-jwt";
import { verifyToken, SESSION_COOKIE } from "../lib/magic";
import { setting } from "../lib/platform";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const isDev = () => process.env.NODE_ENV === "development";

/** Which sign-in this deployment offers. Reported to the browser on 401 so it renders the right UI. */
export function signInMode(): "access" | "magic" | "none" {
  if (setting("CF_ACCESS_TEAM_DOMAIN") && setting("CF_ACCESS_AUD")) return "access";
  if (setting("AUTH_SECRET")) return "magic";
  return "none";
}

// Identity comes ONLY from (1) a verified Cloudflare Access JWT, or (2) a signed session cookie from an
// emailed magic link. Synthetic header identities work only on a local host in dev or when
// ALLOW_TEST_HEADERS=1, and are ignored whenever Access or magic-link auth is configured.
export async function getUser(): Promise<AppUser | null> {
  const h = await headers();
  const mode = signInMode();

  if (mode === "access") {
    const identity = await verifyAccessJwt(h.get("cf-access-jwt-assertion"), {
      teamDomain: setting("CF_ACCESS_TEAM_DOMAIN")!,
      aud: setting("CF_ACCESS_AUD")!,
    });
    if (!identity) return null;
    return { userId: identity.userId, email: identity.email, fullName: identity.name, displayName: identity.name ?? identity.email };
  }

  if (mode === "magic") {
    const email = await verifyToken(setting("AUTH_SECRET"), "session", (await cookies()).get(SESSION_COOKIE)?.value);
    if (!email) return null;
    return { userId: email, email, fullName: null, displayName: email };
  }

  const local = LOCAL_HOST.test(h.get("host") ?? "");
  if (local && (isDev() || setting("ALLOW_TEST_HEADERS") === "1")) {
    const userId = h.get("oai-authenticated-user-id");
    const email = h.get("oai-authenticated-user-email");
    if (userId && email) return { userId, email, fullName: null, displayName: email };
  }
  return null;
}

// Owners are configured, never self-assigned. Local dev falls back to the synthetic preview identity.
export function ownerEmails(): string[] {
  const list = setting("OWNER_EMAILS") ?? (isDev() ? "seedy@sites.test" : "");
  return list.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
