# Security baseline

Scope: the CQL Next.js application, SQLite/libSQL database, password authentication, and production secrets.

## Required controls

- Vercel must serve HTTPS and HSTS. Application headers deny framing, MIME sniffing, unnecessary browser permissions, and cross-origin opener sharing.
- CSP begins in report-only mode. Review `/api/csp-report` logs, remove legitimate violations, then promote it to enforcing mode.
- Owners authenticate with an email in `OWNER_EMAILS` and `ADMIN_PASSWORD`. Clients authenticate with the password an owner creates for them.
- Passwords use PBKDF2 hashes, sessions expire after seven days, and authentication attempts are limited per email and source IP.
- Every state-changing API request requires a matching same-origin request. Authorization is enforced server-side.
- Secrets stay in Vercel encrypted environment variables. Never expose `AUTH_SECRET`, `DATABASE_AUTH_TOKEN`, `RESEND_API_KEY`, or `VAULT_KEY` to the browser or support tickets.
- Vault reads, application creation/submission, authentication, and settings changes are written to `audit_events`.
- Files are restricted by extension and size. Vercel uploads are capped at 4 MB until direct object-storage uploads with malware scanning are provisioned.
- Review hosting, SQLite provider, DNS, and GitHub administrative access quarterly and require 2FA.
- Review dependencies and this baseline quarterly and after material architecture changes.

## Production verification

1. `GET /api/health` returns 200 with both checks true.
2. `GET /api/session` without a cookie returns 401 and `signIn: "password"`.
3. An incorrect password is rejected without revealing whether the email exists.
4. Sign out clears the session cookie and returns to the sign-in page.
5. Security headers are present on `/` and API responses.
6. Audit events appear after owner login and a vault reveal.

Security reports: `info@corequantumleads.com`.

