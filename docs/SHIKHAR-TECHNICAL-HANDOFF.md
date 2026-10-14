# Technical Handoff — STEM with Ashley Admin Dashboard

For Shikhar (or any future developer). Ashley's non-technical guides are
`ASHLEY-ADMIN-GUIDE.md` and `ASHLEY-APP-USER-GUIDE.md`, also served as
`/admin/guide.html`.

## 1. Architecture

```
                     ┌──────────────── public, static (unchanged) ─────────────────┐
 students ──────────►│ index.html · app.js · interview*.js · worksheet*.js · jobs/ │◄── Vercel CDN
                     │ content: data/roadmap-data.json · jobs/jobs-data.js ·      │      ▲
                     │          interview-data.js                                 │      │ auto-deploy
                     └────────────────────────────────────────────────────────────┘      │ on push
                                                                                         │
 Ashley ── /admin/ (static SPA: admin.js + admin-forms.js + cms-schema.js) ──────┐       │
            │ supabase-js 2.45.4 (jsDelivr, SRI-pinned): sign-in, sessions       │       │
            ▼                                                                    │       │
     Supabase Auth  ◄── token check ── /api/* (Vercel Node functions, no deps) ◄─┘       │
     Supabase DB    ◄── user's JWT (RLS) ──┤                                             │
       cms_drafts / cms_publications / cms_audit                                         │
                                           └── GITHUB_TOKEN ──► GitHub API ── 1 commit ──┘
```

- **Published content lives in Git.** A publish is ONE commit on `master` (Git Data
  API: tree → commit → non-forced ref update), so multi-file publishes are atomic and
  every version is restorable. The public site has no runtime dependency on
  Supabase or the API.
- **Drafts, publication log, audit trail** live in Supabase Postgres. The API calls
  PostgREST **with the signed-in user's JWT**, so RLS applies on top of the API's own
  role check.
- **Authorization:** every `/api/*` call (except `config`, `keepalive`) runs
  `requireUser()` (`api/_lib/auth.js`). It sends the bearer token to
  `GET /auth/v1/user` (validates signature, expiry, and that the user exists), then
  requires `app_metadata.cms_role` ∈ {`admin`, `editor`}. `/api/team` requires
  `admin`. `app_metadata` is writable only with the service key, so public sign-up
  can never grant access.
- **Validation:** `admin/cms-schema.js` is shared by the browser (forms + instant
  checks) and the server (authoritative). The server rebuilds every object from the
  schema (unknown keys dropped), merges only *managed* keys from the client (other
  keys always come from the live file), and validates the whole set (required fields,
  lengths, enums, http(s)-only URLs, unique IDs/names, major→field and job→field
  references, real jobs need `sourceUrl`).
- **Concurrency:** each draft stores the git blob SHA of the file it started from.
  Publishing compares it with the current file → 409 `conflict` until the user picks
  "keep mine" (`overwrite`) or "start over". The non-forced ref update rejects a
  publish if `master` moved mid-request → 409 `head_moved`. Nothing is half-published.
- **"Live" is verified:** `/api/status` reads the `Vercel` commit status from GitHub
  (pending → deploying, failure → failed) and then fetches each published file from
  `PUBLIC_SITE_URL`, hashes it as a git blob, and reports `live` only when the
  hashes match the commit.
- **Preview:** the dashboard opens the real public pages in a same-origin iframe with
  `?cms-preview=1`. `utils.js#receivePreviewData` asks the parent (same-origin check
  on both sides) for draft data, and `app.js`/`jobs-app.js` render it instead of
  fetching. External links render only if http(s) (`safeHttpUrl`).
- **Keep-alive:** free Supabase projects pause after ~7 days idle. The daily Vercel
  cron `/api/keepalive` (protected by `CRON_SECRET`) calls the `cms_ping()` RPC.

### API endpoints (`api/*.js`; `api/_lib/*` are shared modules, not routes)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/config` | public | Supabase URL + anon key + site URL (all public values) |
| `GET /api/me` | editor | identity, role, which server features are configured |
| `GET /api/content` | editor | live docs (from GitHub; falls back to reading the live site if no GitHub token) + drafts |
| `PUT /api/draft` / `DELETE /api/draft?doc=` | editor | save / discard a draft (sanitized; validation returned as warnings) |
| `POST /api/publish` `{dryRun?, overwrite?}` | editor | validate + atomic commit; 422 invalid, 409 conflict/head_moved, 503 GitHub creds |
| `GET /api/status?sha=&files=path:blob,…` | editor | queued / deploying / verifying / live / failed |
| `GET /api/history` | editor | versions (GitHub commits touching content files) + who published + audit log (rows normalized: they're editor-writable) |
| `POST /api/restore` `{sha, discardDrafts}` | editor | re-publish managed content from an old commit as a new commit |
| `GET/POST /api/team` | admin | list users, invite / one-time sign-in link, change role (needs service key) |
| `GET /api/keepalive` | cron secret | Supabase keep-alive |

Rate limits (per user per hour, counted from the audit log): 600 draft saves, 30
publishes/restores, 40 team actions. Request bodies are capped at 2 MB.

## 2. Repository structure (new/changed parts)

```
admin/index.html, admin.css      dashboard shell + styles (same tokens as styles.css)
admin/admin.js                   dashboard controller (auth, routing, editors, publish, history, team)
admin/admin-forms.js             spec-driven form renderer
admin/cms-schema.js (+ .test.js) content schema: validation, sanitizing, change summaries, file I/O
admin/guide.html                 Ashley's guides rendered as a page (generated, see §8)
api/                             Vercel functions (see table)
data/roadmap-data.json           content (unchanged format)
jobs/jobs-data.js, interview-data.js   content as JSON between /* CMS-DATA-START */ … /* CMS-DATA-END */
scripts/dev-server.js            local server running the real /api handlers
scripts/fake-github.js           in-memory GitHub for local dev/tests
supabase/migrations/0001_cms.sql database schema + RLS (already applied)
tests/api.test.js, tests/fakes/  API tests (fake GitHub + fake Supabase)
tests/e2e/                       Playwright (own package.json; real Supabase + fake GitHub)
vercel.json                      cron + security headers (CSP etc. on /admin)
.vercelignore                    keeps tests/scripts/supabase/videos out of deployments
docs/                            these guides + images/
```

The editable content files must keep their markers. Hand edits are fine as long
as the text between the markers stays valid JSON (double-quoted keys, no trailing
commas). `node --test` catches mistakes.

## 3. Hosting & deployment

- Vercel project **stem-with-ashley** (your personal Vercel team),
  framework "Other", no build command, Node 24.x. Production =
  `master` → <https://stem-with-ashley.vercel.app>.
- Every dashboard publish is a commit authored as
  "STEM with Ashley Admin Dashboard" (never the editor's email, because this repo is
  public; who published is recorded only in the private `cms_publications` table), which triggers a normal production deploy (one deploy
  per publish; the Vercel account limit is 100 deploys/day).
- Preview deployments (other branches) have **no env vars**, so the admin API there
  is inert by design and can never publish to `master`.

## 4. Services, environment variables, costs

| Variable | Secret? | Where it comes from |
| --- | --- | --- |
| `SUPABASE_URL` | no | `https://uoitamnbnpsehxfdqvrl.supabase.co` — **set** |
| `SUPABASE_ANON_KEY` | no (public by design) | legacy anon JWT — **set** |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Supabase → Project Settings → API Keys → `service_role` — **you must add** |
| `GITHUB_TOKEN` | **yes** | fine-grained PAT (below) — **you must add** |
| `GITHUB_REPO` / `GITHUB_BRANCH` | no | `shikharsisodia7/stem-with-ashley` / `master` — **set** |
| `PUBLIC_SITE_URL` | no | `https://stem-with-ashley.vercel.app` — **set** |
| `CRON_SECRET` | **yes** | random 32-byte hex — **set** (Vercel injects it into the cron call) |

All are Production-only in Vercel. `.env.example` lists them, and `.env.local`
(gitignored) holds local/test values.

**Supabase project:** `stem-with-ashley-admin` (ref `uoitamnbnpsehxfdqvrl`,
us-west-1, org "shikharsisodia7's Org", **Free plan**). Tables: `cms_drafts`
(PK `doc`), `cms_publications`, `cms_audit`; helper functions `cms_role()`,
`cms_is_editor()`, trigger `cms_stamp_actor()` (stamps the JWT email so nobody can
log as someone else), `cms_ping()`. Security advisor: 0 findings.

**Costs:** Supabase Free ($0; 500 MB DB, 50k MAU). Vercel functions: a few
invocations per edit (the team is on Pro, so usage is billed beyond included
amounts, but this traffic is negligible). GitHub: free. No paid APIs are called.

**Test-only accounts** in Supabase Auth (fake `.test` domain, can't receive email):
`cms-e2e-admin@stemwithashley.test` (admin) and `cms-e2e-norole@stemwithashley.test`
(no role), used by `tests/e2e`. Passwords are only in your local `.env.local`. To
remove them: Supabase → Authentication → Users → delete (and drop their lines from
`.env.local`). Leaving them is harmless but they are real admin logins.

## 5. Account setup (COMPLETED 2026-10-13)

**Status: all done and verified on the live site.**
- `GITHUB_TOKEN`: fine-grained token "stem-with-ashley-admin-publish", this repo only,
  Contents read/write + Commit statuses read; **expires 2027-10-13** (calendar it,
  see §7 to rotate). Saved to Vercel Production.
- `SUPABASE_SERVICE_ROLE_KEY` saved to Vercel Production.
- Supabase Auth: Site URL `…/admin/`, redirect `…/admin/**`, public sign-ups OFF,
  email link/OTP expiry 86400 s, minimum password length 10.
- Production redeployed. Verified live: Publish enabled, Version History loads, Team
  access lists users, and a real commit test on a throwaway branch passed.
- Accounts: Ashley (Administrator) was emailed a one-time setup link. Your own
  setup link was saved to your Desktop.
- Custom SMTP (step 7) is still optional: until it's configured, "Forgot your
  password?" emails only reach Supabase org members, so make Ashley's reset links
  from Team access.

The original steps are kept below for reference, for example to redo the setup on a
new project:

1. **GitHub token for publishing.** <https://github.com/settings/personal-access-tokens/new>
   → Token name `stem-with-ashley-admin-publish` → Expiration: custom, up to 1 year
   (put the date in your calendar) → Repository access: **Only select repositories →
   stem-with-ashley** → Permissions → Repository: **Contents: Read and write**,
   **Commit statuses: Read-only** (Metadata: read is automatic) → Generate. Then in the
   repo folder:
   `vercel env add GITHUB_TOKEN production` and paste it when asked.
2. **Supabase service key.** <https://supabase.com/dashboard/project/uoitamnbnpsehxfdqvrl/settings/api-keys>
   → Legacy API keys → `service_role` → Reveal → copy →
   `vercel env add SUPABASE_SERVICE_ROLE_KEY production`.
3. **Supabase Auth settings.** <https://supabase.com/dashboard/project/uoitamnbnpsehxfdqvrl/auth/url-configuration>
   - **Site URL:** `https://stem-with-ashley.vercel.app/admin/`
   - **Redirect URLs:** add `https://stem-with-ashley.vercel.app/admin/**`
   - Authentication → Sign In / Providers → **turn OFF "Allow new users to sign up"**
     (access already requires a role, but this keeps the user list clean)
   - Email provider → **Email OTP Expiration: 86400** (24 h, so invite links survive
     until Ashley opens them) → **Minimum password length: 10**
4. **Redeploy** so the functions see the new variables: `vercel --prod` from the repo
   (or Vercel → Deployments → ⋯ → Redeploy on the latest production deployment).
5. **Your own admin account.** An account for your personal Gmail with the
   Administrator role already exists, with no password set. Open
   <https://stem-with-ashley.vercel.app/admin/> → **Forgot your password?** → enter
   your Gmail. The email arrives because Supabase's built-in mailer only delivers to
   members of your Supabase org, and you are one. Click it, set your password, and
   you're in.
6. **Invite Ashley.** Dashboard → **Settings → Team access → Invite someone** → her
   email → **Administrator** → **Create invite link** → paste the link into the
   handoff email (`docs/ASHLEY-HANDOFF-EMAIL.md`). The link works once and expires
   after the OTP expiry from step 3.
7. *(Recommended)* **Custom SMTP** so "Forgot your password?" emails reach Ashley.
   The built-in mailer won't send to non-team addresses.
   Supabase → Authentication → Emails → SMTP Settings (e.g. a free Resend account
   with a verified domain, or a Gmail address with an app password). Until then,
   reset links for Ashley come from **Team access → Create sign-in link**.
8. **Verify:** sign in → edit a harmless resource description → Save draft → Preview
   → Publish → wait for ✓ Live → check the public page → Version History → Restore
   the previous version.

## 6. Managing access

- **Roles:** `admin` (content + team), `editor` (content only), none = no access.
  Stored in `auth.users.raw_app_meta_data.cms_role`.
- **Add/remove people:** dashboard → Settings → Team access (admins). Removing a role
  locks the account out of the API immediately (the role is re-read from Supabase on
  every request). Its last access token stays valid against the database for up to
  an hour, but RLS also checks the JWT's role claim, which goes stale rather than
  granting anything new.
- **Emergency lockout:** Supabase → Authentication → Users → ⋯ → Ban/Delete, or
  remove `GITHUB_TOKEN` from Vercel to stop all publishing instantly.
- **Transferring ownership to Ashley later:** transfer the GitHub repo (Settings →
  Transfer), transfer the Vercel project (Project Settings → Transfer), transfer the
  Supabase project to an org she owns (Project Settings → General → Transfer), then
  issue a new GitHub token from the new owner and update `GITHUB_REPO`/`GITHUB_TOKEN`.
  Never share your personal accounts.

## 7. Credentials rotation

- **GitHub token:** create a new fine-grained token (same settings) →
  `vercel env rm GITHUB_TOKEN production` → `vercel env add GITHUB_TOKEN production` →
  redeploy → delete the old token on GitHub. When it expires, the dashboard shows
  "publishing access has expired" and drafts stay safe.
- **Supabase service key / JWT secret:** rotate in Supabase → API Keys, then update
  `SUPABASE_SERVICE_ROLE_KEY` (and `SUPABASE_ANON_KEY` if the JWT secret changed) and
  redeploy. Rotating the JWT secret signs everyone out.
- **CRON_SECRET:** any new random string → update → redeploy.

## 8. Maintenance

- **Tests** (no install needed): `node --test` runs 110 tests: data, schema,
  API with fake GitHub + fake Supabase, secret scan.
- **Browser tests:** `cd tests/e2e && npm ci && npx playwright test` (19 tests; real
  Supabase sign-in with the e2e accounts, fake GitHub, so nothing real is published).
  On this Windows laptop browsers must run through the Docker relay
  (`PW_TEST_CONNECT_WS_ENDPOINT`); never launch Chrome directly.
- **Local dashboard:** `CMS_FAKE_GITHUB=1 node scripts/dev-server.js` → <http://127.0.0.1:4321/admin/>
  (real Supabase from `.env.local`, fake GitHub, local server acts as the live site).
- **Regenerate Ashley's HTML guide** after editing the markdown guides:
  `node scripts/build-guide.js` (uses pandoc).
- **Adding a new editable field:** add it to the spec in `admin/cms-schema.js` (form,
  validation, and sanitizing all follow), make the public renderer show it, add a
  test. Keys not in the spec are dropped on save for dashboard-managed objects.
- **Adding a new content collection:** add a `COLLECTIONS` entry (and
  `MANAGED_KEYS` for its document), a sidebar link in `admin/index.html`, and tests.
- **Supabase schema changes:** add `supabase/migrations/000N_*.sql`, apply it in the
  SQL editor (or with the Supabase CLI), and keep RLS on.

## 9. Backup & restore

- **Content:** every version is a Git commit. Use Version History in the dashboard, or
  `git revert` / check out old versions of the three content files. GitHub is the
  backup.
- **Drafts/log/audit:** Supabase Free has no point-in-time recovery. The data is
  small and non-critical (drafts are work in progress; history is reconstructable from
  Git). Export any time: Supabase → Table Editor → Export CSV, or
  `pg_dump` with the connection string.
- **If Supabase is lost entirely:** create a project, run
  `supabase/migrations/0001_cms.sql`, update `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY`, re-invite users. The public site is unaffected
  throughout.

## 10. Known limitations

- The built-in Supabase mailer delivers only to your org's members, so Ashley's
  self-serve reset emails need custom SMTP (§5.7).
- Interview checklist progress in students' browsers is stored by position, so
  inserting checklist items mid-list shifts saved ticks.
- One shared draft per content document (fine for one or two editors). Two people
  editing the same document at once share a draft; the last save wins.
- Job Finder is hand-curated. There is no live feed.
- supabase-js is loaded from jsDelivr (SRI-pinned). If the CDN is unreachable, the
  dashboard can't sign in. The public site is unaffected.
- The first dashboard publish reformats `data/roadmap-data.json` from its
  hand-compacted style to standard 2-space JSON (content identical; one large diff).

## 11. Troubleshooting & rollback

See `docs/TROUBLESHOOTING.md`. Fast rollback of a bad publish: dashboard → Version
History → Restore, or Vercel → Deployments → promote the previous production
deployment (instant, but the next publish re-deploys `master`), or
`git revert <sha> && git push`.
