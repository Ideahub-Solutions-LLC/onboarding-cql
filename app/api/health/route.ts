import { getDatabase } from "../../../lib/platform";
import { runtimeReadiness } from "../../../lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = runtimeReadiness();
  let storage = false;
  try {
    const db = await getDatabase();
    storage = Boolean(db && await db.prepare("SELECT 1 AS ok").first());
  } catch {
    storage = false;
  }
  const ready = config.ready && storage;
  return Response.json(
    { status: ready ? "ok" : "unhealthy", checks: { configuration: config.ready, storage } },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
