# CQL Onboarding

A private client onboarding application for Core Quantum Leads.

## Stack

- Next.js and React
- SQLite/libSQL through `@libsql/client`
- Email/password authentication with a signed HTTP-only session cookie
- No Cloudflare Access and no emailed magic links

## Run locally

Requires Node.js 22.13 or newer.

```powershell
npm ci
npm run dev
```

Open <http://localhost:3000>.

Local settings live in the git-ignored `.env.local` file. The configured local database is created automatically under `.data`; no migration command is needed for a new database.

## Sign in and sign out

Owners sign in using an email from `OWNER_EMAILS` and the `ADMIN_PASSWORD` value. The application signs a session cookie using `AUTH_SECRET`.

The Sign out button always opens `/api/auth/logout`, which clears the cookie and returns to the sign-in page.

Owners create a client workspace with:

- Business name
- Client email
- Temporary password of at least 12 characters

The client then signs in with that email and password. Passwords are stored only as PBKDF2 hashes in SQLite.

## Environment settings

```dotenv
DATABASE_URL=file:.data/cql.sqlite
AUTH_SECRET=replace-with-a-long-random-secret
VAULT_KEY=replace-with-a-32-byte-base64-key
OWNER_EMAILS=owner@example.com
ADMIN_PASSWORD=replace-with-a-long-unique-password
```

`DATABASE_AUTH_TOKEN` is needed only when `DATABASE_URL` points to a hosted libSQL database.

## Production

A local SQLite file requires a Node server with persistent disk. Vercel's filesystem is temporary, so a Vercel deployment must use a persistent hosted SQLite/libSQL URL for `DATABASE_URL`. Authentication remains the same email/password flow and does not use Cloudflare or Resend.

Set the variables from `vercel.env.example`, redeploy, and verify:

```text
GET /api/health
```

It should return HTTP 200 with configuration and storage checks set to `true`.

## Verification

```powershell
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The full API suite can be run against a production-mode local server with `npm run test:vercel`.

Operational notes are in `docs/SECURITY.md`, `docs/MONITORING.md`, and `docs/DISASTER_RECOVERY.md`.
