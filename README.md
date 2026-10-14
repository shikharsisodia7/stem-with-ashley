# Stem with Ashley Career Resources — Five-Year STEM Career Roadmap

A web app for recent college graduates entering STEM careers. Pick a field, see a
realistic five-year path from entry-level to senior roles, browse certifications
(linked to the real provider page), schools, conferences, and organizations, explore
developmental skills, work through a 14-step Interview Prep guide, turn your own notes
into a printable practice worksheet, search early-career jobs, and bookmark anything
into a printable shortlist for a career-coach conversation.

- **Live site:** <https://stem-with-ashley.vercel.app>
- **Admin dashboard (content editing):** <https://stem-with-ashley.vercel.app/admin/>

## Updating content (start here if you're Ashley)

Sign in to the **admin dashboard** and edit everything with normal forms: career
fields, majors, skills, resources, interview questions/stages/checklists, and job
listings. Save a draft, preview it, and click Publish; the website updates itself
in about a minute. No GitHub, JSON, or code needed.

- Step-by-step guide: **[docs/ASHLEY-ADMIN-GUIDE.md](docs/ASHLEY-ADMIN-GUIDE.md)**
  (also at `/admin/guide.html` on the live site)
- How every app works: **[docs/ASHLEY-APP-USER-GUIDE.md](docs/ASHLEY-APP-USER-GUIDE.md)**
- Something wrong? **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**
- Video walkthrough + PDF guide: in the dashboard under **Help** (`/admin/media/`).

`STEM-With-Ashley-App-User-Guide.pptx` and `SCREEN-RECORDING-GUIDE.md` are from August 2026
(10 fields, no Interview Prep or admin dashboard) and are **superseded** by the guides above.

## For developers

- **[docs/SHIKHAR-TECHNICAL-HANDOFF.md](docs/SHIKHAR-TECHNICAL-HANDOFF.md)**:
  architecture, environment variables, setup, access management, rotation,
  backups, known limitations.
- **[docs/IMPLEMENTATION-AUDIT.md](docs/IMPLEMENTATION-AUDIT.md)**: what existed before
  the dashboard and why it's built the way it is.

The public site is still plain HTML/CSS/JS with no framework, no build step, and no
runtime dependencies. The admin dashboard adds small Vercel Node functions in
`api/` (no npm dependencies), Supabase for sign-in and drafts, and publishes by
committing content to this repo, which Vercel deploys as before.

Content lives in three files the dashboard edits for you:
`data/roadmap-data.json`, `jobs/jobs-data.js`, and `interview-data.js` (the last two
keep their data as JSON between `/* CMS-DATA-START */ … /* CMS-DATA-END */` markers).
Developers can still edit them by hand; keep the JSON valid and run the tests.

## Running it locally

```
node scripts/dev-server.js                       # static site + the real /api handlers
CMS_FAKE_GITHUB=1 node scripts/dev-server.js      # same, but publishing goes to an in-memory fake repo
```

Then open <http://127.0.0.1:4321> (the dashboard is at `/admin/`). Settings come from
`.env.local` (see `.env.example`).

## Routes in this app

The app is a single-page hash-router (`index.html` + `app.js`). Current routes:

- `#/` — Fields grid (career fields)
- `#/field/<id>` — Field detail (pathway, companies, certs, schools, conferences,
  organizations, podcast/YouTube media links)
- `#/majors` — Majors grid (college majors that feed into STEM fields)
- `#/major/<id>` — Major detail (typical courses, why students choose it, links into
  the STEM field(s) it leads to)
- `#/skills` — Developmental skills
- `#/interview` and `#/interview/1` through `#/interview/14` — the STEM Interview
  Prep Guide: interview-process overview, a full STAR method tutorial with an
  autosaving worksheet, a "Tell Me About Yourself" framework, a searchable
  behavioral/situational/technical question bank (45/28/50 questions) with typed
  practice per question, a technical/coding-interview prep roadmap, browser-native
  video practice (camera + mic, nothing ever uploaded), self-review checklists,
  questions to ask the interviewer, before/during/after checklists, and a final
  readiness check. All content lives in `interview-data.js`; search/filter logic in
  `interview-questions.js`; the recorder in `interview-recorder.js`. Progress is
  saved to `localStorage` only.
- `#/worksheet` — Worksheet Generator: paste class notes or a summary and get a
  printable practice worksheet (fill-in-the-blank, key terms, short answer, optional
  answer key) generated entirely in the browser — nothing is uploaded anywhere. The
  text-transformation logic lives in `worksheet-generator.js` (pure functions, unit
  tested) separately from the DOM rendering in `worksheet.js`.
- `#/resources` — General career-exploration resources, including the O*NET Interest
  Profiler quiz
- `#/shortlist` — Bookmarked items, printable

## Admin dashboard (`/admin/`)

Sign-in (Supabase Auth), content editors for every collection, durable drafts,
preview on the real site, review & publish with live-deployment tracking, version
history with restore, an activity log, and team access with one-time setup links.
Code: `admin/` (UI + shared schema) and `api/` (server). Details are in the
technical handoff.

## Job Finder sub-app

`/jobs/` is a separate, self-contained sub-app living inside this same repo and
deploy — it's a second static HTML page (`jobs/index.html` + its own JS/CSS) that
loads independently of the hash-router above. Reach it directly at `/jobs/`, via the
"Find a Job" link in the main nav, or from the Resources page. It filters job listings (each labeled in the UI as a Sample or a Real listing with a link to the original posting) by field,
keyword, experience level, and location, using a pure filtering function
(`jobs/jobs-filter.js`) covered by Node test-runner tests (`jobs/jobs-filter.test.js`,
run with `node --test jobs/jobs-filter.test.js`). Listings are managed in the admin dashboard; a real job-listings API could later replace `jobs/jobs-data.js` without changing the filter logic or UI.

## Project structure

```
stem-with-ashley/
  index.html, styles.css, app.js, utils.js   # public site shell, routing, shared helpers
  interview*.js, worksheet*.js                # Interview Prep + Worksheet Generator (+ tests)
  interview-data.js                           # interview content (dashboard-managed parts + developer parts)
  data/roadmap-data.json                      # fields, majors, skills, resources
  jobs/                                       # Job Finder sub-app (jobs-data.js = listings)
  admin/                                      # admin dashboard UI, shared content schema, guide.html
  api/                                        # Vercel functions for the dashboard (api/_lib = shared code)
  scripts/                                    # local dev server, fake GitHub, guide builder
  supabase/migrations/                        # database schema for drafts/history/audit
  tests/                                      # API tests (Node) + e2e browser tests (Playwright)
  docs/                                       # guides, handoff, troubleshooting, screenshots
  vercel.json                                 # daily keep-alive cron + admin security headers
```

## Running the tests

No install needed. Node's built-in test runner finds every `*.test.js`:

```
node --test
```

Browser tests (Playwright; real Supabase sign-in, fake GitHub):

```
cd tests/e2e && npm ci && npx playwright test
```

## Notes on scope

This is a working prototype, not a finished product — built to be functional and
useful now, and iterated on over time. Bookmarks and Interview Prep / Worksheet
Generator progress are stored in each visitor's browser only (no accounts, no
server-side storage), so none of it persists across devices or survives clearing
browser data. The Worksheet Generator's fill-in-the-blank/key-term/short-answer logic
is a heuristic (word-frequency and sentence-based), not an AI model — it's designed so
an AI-backed version could later replace `worksheet-generator.js`'s `generateWorksheet()`
function without touching any UI code.
