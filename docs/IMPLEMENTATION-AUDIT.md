# Implementation Audit — Admin Dashboard (October 2026)

Written before and during the admin-dashboard build. It records what the platform
looked like, what was actually missing, the architecture decision, and the checklist
the work was measured against.

## 1. What existed (audited 2026-10-12, `master` @ `a869f89`)

**Hosting / deploy.** Static files on Vercel (project `stem-with-ashley`, framework
"Other", Node 24, no build step, no env vars). The GitHub repo
`shikharsisodia7/stem-with-ashley` (public, default branch `master`) is Git-linked:
every push to `master` deploys production at <https://stem-with-ashley.vercel.app>.
Vercel reports each deployment back to GitHub as a commit status named `Vercel`.
No branch protection. Local working copy had two untracked items
(`.semgrep/`, `Stem-with-Ashley-Website-Demo.mp4` — an earlier 14 MB demo video);
both were left untouched and uncommitted.

**Public apps** (hash routes in `index.html` + `app.js`, plus `jobs/`):

| App | Route | Content source | Browser-local state |
| --- | --- | --- | --- |
| Career Roadmap (12 fields) | `#/`, `#/field/<id>` | `data/roadmap-data.json` → `fields` | — |
| College Majors (11) | `#/majors`, `#/major/<id>` | `roadmap-data.json` → `majors` | — |
| Developmental Skills (10) | `#/skills` | `roadmap-data.json` → `skills` | — |
| Resources (1) | `#/resources` | `roadmap-data.json` → `resources` | — |
| Interview Prep (14 steps, 123 questions) | `#/interview/<1-14>` | `interview-data.js` (JS global) | `stemInterviewState` (answers, favorites, checklists) |
| STAR worksheet / TMAY builder / video practice | inside Interview Prep | `interview-data.js`; recorder uses `MediaRecorder` in memory only | same key; recordings never stored |
| Worksheet Generator | `#/worksheet` | logic only (`worksheet-generator.js`) | `stemWorksheetState` |
| My Shortlist | `#/shortlist` | bookmarks of the above | `stemRoadmapBookmarks` |
| Job Finder (12 sample listings) | `/jobs/` | `jobs/jobs-data.js` (`SAMPLE_JOBS` global) | — |

**Content schemas.** `roadmap-data.json` is clean JSON (all 58 certifications have
name/provider/url; all URLs https). `interview-data.js` and `jobs-data.js` were
hand-written JavaScript object literals (unquoted keys), so no tool could safely
rewrite them.

**The `/admin/` "Content Helper".** A form that produced JSON snippets to copy/paste
into files and commit by hand. No saving, no publishing, no authentication — it said
so itself. Not usable by a non-technical editor.

**Tests.** 63 Node `node:test` tests (data shape, interview data, question filter,
STAR helper, recorder helpers, worksheet generator, jobs filter). No browser tests.

**External services / secrets.** None. `.env.local` held only a Vercel CLI OIDC token
(gitignored).

**Known issues found.**
- Interview checklist progress is stored by list position, so inserting/removing a
  checklist item shifts students' saved ticks (documented; not changed).
- Hand-edited JSON had no guard rails beyond `data/roadmap-data.test.js`, which only
  runs if someone runs it.

## 2. Deficiencies vs. Ashley's request

1. No way to update content without GitHub/JSON knowledge.
2. No accounts, so no "login" to send her.
3. No drafts, preview, publish confirmation, history, or undo.
4. Job listings could not be marked as real vs. sample.
5. Instructions (`data/README.md`, root README, `SCREEN-RECORDING-GUIDE.md`) described
   the manual JSON + Git workflow.

## 3. Architecture decision

Keep the public site exactly as it is: static, no runtime dependency. Add a small
server layer only for the admin.

```
Ashley's browser ──sign in──► Supabase Auth (email + password, one-time setup links)
      │ access token
      ▼
/api/* (Vercel Node functions) ── verifies token + app_metadata.cms_role on EVERY call
      ├─► Supabase Postgres (via the user's own token → row-level security)
      │      cms_drafts · cms_publications · cms_audit
      └─► GitHub REST (server-side fine-grained token)
             blobs/tree → ONE commit → fast-forward ref update on master
                                   │
                                   ▼
                     Vercel auto-deploys (unchanged pipeline)
                                   │
      /api/status ◄── GitHub "Vercel" commit status + hash of the LIVE file
```

**Why this shape**
- *Content stays in Git.* The public site never depends on the database. If
  Supabase is down or paused, students see no difference. Every published version is
  a Git commit, which gives free, permanent history and an easy restore.
- *Supabase* for auth + private state: an established auth provider (no homegrown
  passwords), free tier, built-in row-level security, admin API for invite/reset
  links. A daily Vercel cron keeps the free project from pausing.
- *No framework, no build step, no npm dependencies* for the site or the API (the
  API uses Node's built-in `fetch`). supabase-js is loaded in the admin page from
  jsDelivr, pinned to 2.45.4 with a subresource-integrity hash.
- *One schema file* (`admin/cms-schema.js`) drives form rendering, client-side
  checks, and the authoritative server-side validation, so they can't drift apart.

**Rejected alternatives**: moving content into a database (would make the public
site depend on it); a Git-based CMS like Decap (requires GitHub accounts for editors);
Clerk (good, but no dashboard access available here and no database for drafts);
storing drafts in localStorage (lost on another device; prompt forbids).

## 4. Implementation checklist

- [x] Supabase project `stem-with-ashley-admin` (us-west-1, free) with
      `cms_drafts`, `cms_publications`, `cms_audit`, RLS, actor-stamping trigger,
      keep-alive RPC (`supabase/migrations/0001_cms.sql`). Security advisor: 0 issues.
- [x] `jobs-data.js` / `interview-data.js` converted to JSON between
      `/* CMS-DATA-START */ … /* CMS-DATA-END */` markers (data verified identical).
- [x] Shared schema + validation (URLs http(s) only, required fields, lengths,
      enums, unique IDs/names, field references, real-job source link).
- [x] API: `config, me, content, draft, publish, status, history, restore, team, keepalive`.
- [x] Dashboard: sign-in, password setup/reset, overview, 8 content editors,
      search, add/edit/delete/reorder, unsaved-change guard, preview,
      review & publish, live tracker, version history + restore, settings, team access,
      idle sign-out, mobile layout.
- [x] Public apps: preview hook, Sample/Real job labels with source links.
- [x] Tests: schema (17), API with fakes (28), Playwright e2e (19 incl. real Supabase).
- [x] Docs: admin guide, app user guide, technical handoff, troubleshooting,
      recording script, handoff email.
- [x] Owner account setup (tokens, Supabase settings, accounts): completed 2026-10-13 — see the technical handoff, §5 "Account setup".

## 5. What stays developer-maintained

Page layout/design; the STAR worksheet, "Tell Me About Yourself" builder, technical
prep notes, self-review checklists, and STAR example (sections of
`interview-data.js` outside the dashboard's managed keys); Worksheet Generator logic;
connecting a live job feed; anything in `app.js`/`interview.js`.
