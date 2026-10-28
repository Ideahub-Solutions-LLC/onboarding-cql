import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { verifyAccessJwt } from "../lib/access-jwt";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type AuthEnv = {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ALLOW_TEST_HEADERS?: string;
  OWNER_EMAILS?: string;
};

const LOCAL_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

// Production identity comes ONLY from a verified Cloudflare Access JWT.
// Synthetic header identities work only on a local host in dev or when
// ALLOW_TEST_HEADERS=1, and are ignored whenever Access is configured.
export async function getUser(): Promise<AppUser | null> {
  const e = env as unknown as AuthEnv;
  const h = await headers();

  if (e.CF_ACCESS_TEAM_DOMAIN && e.CF_ACCESS_AUD) {
    const identity = await verifyAccessJwt(h.get("cf-access-jwt-assertion"), {
      teamDomain: e.CF_ACCESS_TEAM_DOMAIN,
      aud: e.CF_ACCESS_AUD,
    });
    if (!identity) return null;
    return {
      userId: identity.userId,
      email: identity.email,
      fullName: identity.name,
      displayName: identity.name ?? identity.email,
    };
  }

  const local = LOCAL_HOST.test(h.get("host") ?? "");
  if (local && (import.meta.env.DEV || e.ALLOW_TEST_HEADERS === "1")) {
    const userId = h.get("oai-authenticated-user-id");
    const email = h.get("oai-authenticated-user-email");
    if (userId && email) return { userId, email, fullName: null, displayName: email };
  }
  return null;
}

// Owners are configured, never self-assigned. Local dev falls back to the
// synthetic preview identity so `npm run dev` works without extra setup.
export function ownerEmails(): string[] {
  const configured = (env as unknown as AuthEnv).OWNER_EMAILS;
  const list = configured ?? (import.meta.env.DEV ? "seedy@sites.test" : "");
  return list.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
