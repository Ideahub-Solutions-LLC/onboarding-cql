# CQL On-boarding System

A private, persistent client onboarding app for Core Quantum Leads.

## Included
- Eight-step client intake, beginning with signup. Clients complete and save each step to unlock the next. Draft saving, required-field checks, and client-specific applications are included.
- A2P preparation, optional verification uploads, domain/email, phone and calendar preferences, contacts, follow-up SOP builder, optional AI receptionist, and pricing acknowledgment.
- D1-backed records and private R2 attachments, with authorization on each API operation.
- Domain password vault using AES-GCM. VAULT_KEY is a 32-byte base64 runtime secret, kept out of source and form exports. Delegated domain access is offered first.
- Team workspace with application states, internal notes, file downloads, versioned rate snapshots, and a launch checklist.
- Editable logo, brand color, support address, staff allowlist, signup options, and usage menu.
- Add, edit, hide, reorder, or delete signup options without rebuilding. Each option has a name, description, badge, button text, and HTTPS destination.
- CSV price imports with a preview and a choice to replace the menu or update matching services. Downloadable PDF, Excel, and CSV price-list documents can be uploaded and replaced separately.

## Operating the app
The Site starts owner-private. Its first signed-in visitor becomes its application owner. Open it as the Site owner before granting anyone access. The owner may add team emails in Brand & settings; those accounts also need Site access. Create each client application with the exact email they use to sign in, grant that client Site viewer access, and copy their application link. No invitation or other email is sent by this app.

The client screen uses larger text, a visual STEP 1 → STEP 8 progress map, and a focused form. The left menu starts hidden and can be shown or hidden with the header button; this display preference is remembered on the device. Completed steps show checkmarks, upcoming steps show locks.

The client sequence is: 1. Create your account; 2. Your business; 3. Business verification; 4. Domain & email; 5. Phone & calendar; 6. Contacts & follow-up; 7. AI receptionist; 8. Review & submit. Clients open a signup link, return, and confirm completion. Existing account holders can use the existing-account option. Confirmation is a client declaration; the team verifies the account and payment status.

Draft answers are saved using Save draft or Save & continue. Files upload immediately. Passwords use the separate Save securely action. Clients can edit drafts and applications marked Changes requested; the team manages the remainder.

In Team settings → Accounts & access options, edit Signup options and click Save settings. Choose Add account option, enter any account name, paste the signup link, and add a description and features (one per line). Turn on Show to clients, then Save settings. This supports standard, free, and special-access accounts without fixed public labels or placeholders. Only published account options appear in Step 1. The supplied Enterprise example is not presented as a free-access offer.

For prices, download the CSV template, edit it in Excel or Google Sheets, and export it as CSV. Its basic columns are service, description, rate, unit, category. Tiered exports also include startup_rate, business_rate, scale_rate, section, billing, and details. Import the exported CSV to preserve all tier rates and billing details. Category is Usage, Setup, or AI; leave rate blank for To be confirmed. Import, review, choose replace or update, apply to draft, then Save settings. You can also edit rows directly and export the current menu. PDF/Excel document uploads provide a download for clients; they do not populate the individual rates automatically. Uploading and applying drafts do not change client-visible prices until settings are saved.

The supplied CQL customer schedule includes 35 services. Only customer rates are included; supplier costs, markup columns, and the original internal PDF are not distributed to clients. Scale is separate from Enterprise. Domains have an inconsistent unit in the supplied schedule; the AI subscription rows lack final customer prices. These and other unspecified rates remain Confirm with CQL. Voice AI is labeled engine-only; external model usage is not presented as free.

Clients can browse Pricing & features, select a tier for comparison, and request features such as WhatsApp activation and call recording. Requests are saved to their application and become separate team activation checklist items. Selecting a feature or previewing a different tier never activates billing or changes the subscription.

Submitted prices and signup choices are a snapshot. Past submissions retain the acknowledged rates and price-list file, even after updates. Blank rates explicitly require a quote. Signup links open the destinations configured by the team. This app does not process card payments, provision GHL sub-accounts, register A2P campaigns, publish client websites, import contacts into GHL, or activate automations. Those are explicit team checklist tasks. AI receptionist selections are setup instructions, not an active AI calling service.

## Runtime
Vinext / React on Cloudflare Workers; D1 binding DB; R2 binding BUCKET. Hosted authentication is provided by Sites. Runtime secret: VAULT_KEY. Never rotate this key without a data migration for stored credentials.

## Running locally (Git Bash)
Requires Node.js 24 or newer and npm. Run these from the project root in Git Bash.

```bash
# 1. Install dependencies (keep package-lock.json)
npm ci

# 2. Verify: type-check and pure unit checks
npx tsc --noEmit
node tests/catalog.mjs
node tests/pricing.mjs

# 3. Build (generates dist/server/wrangler.json)
npm run build

# 4. Create the local database. Run ONCE, after the first build.
#    Skip if .wrangler/state already has the tables.
npx wrangler d1 execute DB --local --config dist/server/wrangler.json \
  --persist-to .wrangler/state --file drizzle/0000_steady_shard.sql

# 5. Start the dev server
npm run dev
```

Open http://127.0.0.1:5173 and use the local preview sign-in (a synthetic identity such as `seedy@sites.test`). Stop the server with `Ctrl+C`. Never expose this dev server to real clients.

**Optional: password vault preview.** Generate a 32-byte base64 key and put it in a git-ignored `.dev.vars` file, then restart `npm run dev`:

```bash
echo "VAULT_KEY=$(openssl rand -base64 32)" > .dev.vars
```

Use a different key in production, stored in your secret manager.

**Production-build preview and API tests** (localhost:8787 only, synthetic data):

```bash
npm run build
npm start                      # serves dist/ on http://127.0.0.1:8787
# in a second Git Bash window:
node tests/smoke.mjs
node tests/catalog-api.mjs
node tests/features-api.mjs
```

**Troubleshooting: `npm error The operation was rejected by your operating system` (EPERM on `unlink`).** On Windows, `npm ci` deletes `node_modules` first and fails if a running dev server still has native files open (for example `lightningcss.win32-x64-msvc.node`). Stop the dev server with `Ctrl+C` in its terminal, or end it from Git Bash, then re-run `npm ci`:

```bash
# find what is listening on the dev port, then stop that PID
netstat -ano | grep ':5173' | grep LISTENING
taskkill //PID <pid> //F
```

Also close editors or antivirus scans that may be holding files in `node_modules`.

Note: this build is not safe to publish on a public URL until the authentication adapter in `app/chatgpt-auth.ts` is replaced. See DEPLOYMENT.txt.

## Development
Use the Sites skill helpers for install, build, source sync, and publishing. npm run dev serves the portable preview. npm run db:generate produces schema migrations. The production preview uses npm start.

tests/catalog.mjs and tests/pricing.mjs check CSV parsing, catalog validation, exact customer rates, tier separation, and billing distinctions. tests/features-api.mjs checks request persistence, rate snapshots, and activation checklist prerequisites. tests/smoke.mjs and tests/catalog-api.mjs target only 127.0.0.1:8787 with synthetic records and identities. They expect the local database owner local_seedy and a synthetic VAULT_KEY in the local preview. Checks cover access control, CSRF, client isolation, files, encrypted credentials, sequential steps, settings conflicts, price-list access, version snapshots, submission locking, and launch prerequisites. Do not point them at production.
