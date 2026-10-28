# Backup and disaster recovery

## Inventory and targets

| State | Tier | Target RPO | Target RTO |
|---|---:|---:|---:|
| Turso database, including uploaded blobs | 1 | 1 hour | 4 hours |
| `VAULT_KEY` and runtime configuration | 1 | On every change | 4 hours |
| Git repository and deployment configuration | 1 | On every push | 4 hours |
| Vercel logs and audit exports | 2 | 24 hours | 24 hours |

## Required backup architecture

- Enable Turso point-in-time recovery where the plan supports it.
- Export the database daily to encrypted, immutable storage outside the Turso account; retain 30 daily and 12 monthly copies.
- Store `VAULT_KEY` in an organization password/secret manager with offline recovery access. Losing or rotating it without migration makes vault records unrecoverable.
- Export Vercel environment-variable names and configuration after changes; secret values remain in the secret manager, never Git.
- Mirror the Git repository to a second organization or provider.

## Restore runbook

1. Incident owner declares recovery and freezes deployments and application writes.
2. Identify the last known-good timestamp from monitoring and audit events.
3. Restore the selected Turso snapshot/export into a new database.
4. Validate row counts, a synthetic client record, an attachment download, and a vault decrypt using the backed-up `VAULT_KEY`.
5. Update a Vercel preview environment to the restored database and run the full integration suite.
6. Promote the verified configuration, monitor `/api/health`, and re-enable writes.
7. Record actual RPO/RTO, affected records, and follow-up actions.

Run a tabletop drill quarterly and a non-production restore annually. Provider-side backup schedules and immutable storage require Turso/Vercel/backup-account administrator access and must be verified in those dashboards.

