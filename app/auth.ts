import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE } from "../lib/magic";
import { setting } from "../lib/platform";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const isDev = () => process.env.NODE_ENV === "development";

/** Which sign-in this deployment offers. Reported to the browser on 401 so it renders the right UI. */
export function signInMode(): "password" | "none" {
  if (setting("AUTH_SECRET") && setting("ADMIN_PASSWORD")) return "password";
  return "none";
}

// Identity comes only from the signed application session cookie.
export async function getUser(): Promise<AppUser | null> {
  if (signInMode() === "password") {
    const email = await verifyToken(setting("AUTH_SECRET"), "session", (await cookies()).get(SESSION_COOKIE)?.value);
    if (!email) return null;
    return { userId: email, email, fullName: null, displayName: email };
  }
  return null;
}

// Owners are configured, never self-assigned. Local dev falls back to the synthetic preview identity.
export function ownerEmails(): string[] {
  const list = setting("OWNER_EMAILS") ?? setting("ADMIN_EMAIL") ?? (isDev() ? "admin@cql.local" : "");
  return list.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
