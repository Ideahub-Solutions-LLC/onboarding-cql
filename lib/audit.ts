import type { Db } from "./platform";

export async function writeAudit(
  db: Db,
  actorEmail: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.prepare("INSERT INTO audit_events (id,actor_email,action,target_type,target_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), actorEmail.toLowerCase(), action, targetType, targetId ?? null, JSON.stringify(metadata), new Date().toISOString()).run();
}
