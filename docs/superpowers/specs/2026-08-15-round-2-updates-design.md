# Stem-With-Ashley — Round 2 Updates Design Spec

Date: 2026-08-15

## Purpose

Second round of updates to the existing STEM career roadmap app, driven by Ashley's
latest priorities: help students see what a career actually looks like day-to-day
(podcast/YouTube links), add the real STEM With Ashley branding, give college-to-career
students a path into job search, point students toward a credible external career
quiz, and add a majors-explorer front door for students who haven't picked a major yet.

Everything from round 1 (Fields, Skills, Shortlist, bookmarking, print/PDF, the
zero-build static-site architecture, and the `data/roadmap-data.json` hand-editable
data model) stays exactly as-is. This round only adds to it.

Explicitly out of scope this round (per Ashley, deferred to later): interview
simulator, resume builder, calculator, PowerPoint usage guide, Word interview-simulator
outline. Do not build or draft any of these.

## Data Architecture (additions to `data/roadmap-data.json`)

Same single hand-editable JSON file, same `data/README.md` editing-guide pattern. Three
additions:

### 1. `media` array on each existing field object

```jsonc
{
  "id": "aerospace-engineering",
  // ...existing field properties unchanged...
  "media": [
    {
      "type": "youtube",           // "youtube" | "podcast"
      "title": "Day in the Life of an Aerospace Engineer at [Company]",
      "url": "https://youtube.com/watch?v=...",
      "description": "One sentence on what this video actually shows."
    }
  ]
}
```

- 1-3 items per field, mixing at least one "day in the life" YouTube video with a
  career-relevant podcast episode/show where a good one exists.
- Every URL is verified before being added (see Verification Method below). If no solid
  "day in the life" video exists for a field, that field ships with fewer/no media items
  rather than a weak or tangential link — noted honestly in the completion report.
- Rendered in a new "Hear/see what this is really like" block on the existing
  `#/field/<id>` page, opening in a new tab (`target="_blank" rel="noopener noreferrer"`).

### 2. New top-level `majors` array

```jsonc
{
  "majors": [
    {
      "id": "mechanical-engineering-major",   // URL-safe slug, unique
      "name": "Mechanical Engineering",
      "summary": "One-line description for the majors grid card.",
      "typicalCourses": ["Statics", "Thermodynamics", "..."],
      "whyChooseIt": "Short paragraph on what draws students to this major.",
      "leadsToFields": ["mechanical-engineering"]   // fieldId(s) from the fields array
    }
  ]
}
```

- Majors are a distinct, earlier-stage content type from Fields: Fields describe
  post-grad career pathways; Majors describe the undergraduate decision, and each major
  links forward into the Field(s) it typically leads to via `leadsToFields`.
- Most majors will map 1:1 to an existing field (e.g. "Mechanical Engineering" major →
  `mechanical-engineering` field), but the array supports one major leading to multiple
  fields (e.g. a "Biology" major might lead into both Biotechnology and Public Health)
  and is intentionally a separate list so it can grow independently of Fields.

### 3. New top-level `resources` array

```jsonc
{
  "resources": [
    {
      "title": "O*NET Interest Profiler",
      "url": "https://www.mynextmove.org/explore/ip",
      "provider": "U.S. Department of Labor",
      "description": "Free ~20-minute RIASEC-based interest assessment that maps your answers to 900+ real occupations with salary and outlook data. Good starting point if you don't know which STEM field fits you yet."
    }
  ]
}
```

- Starts with exactly one entry: the O\*NET Interest Profiler (see Career Quiz Selection
  below). Ashley can add more over time following the same copy-a-block pattern as
  fields/majors/skills.

## New Pages / Routes (extending the existing hash router in `app.js`)

| Route | Page | Notes |
|---|---|---|
| `#/majors` | Majors grid | Same visual pattern as the existing Fields home grid |
| `#/major/<id>` | Major detail | Typical courses, why choose it, "Careers this leads to" links into `#/field/<id>` |
| `#/resources` | Resources | Lists `resources` array; includes a card linking to the Job Finder (`/jobs/`) |

Existing routes (`#/`, `#/field/<id>`, `#/skills`, `#/shortlist`) are unchanged. Nav gets
two new links: "Majors" and "Resources", alongside the existing Fields/Skills/Shortlist.

## Branding / Logo

- Real asset already obtained and verified: `assets/logo.jpeg` (square photo-style
  graphic with "All Things STEM with Ashley" text baked in, sourced from Ashley's Google
  Drive).
- Placed in `.site-header` next to the existing "Stem With Ashley" text link: a small
  rounded thumbnail (`object-fit: cover`, fixed aspect ratio via `aspect-ratio: 1 / 1`,
  responsive `width`/`height` via `clamp()` or a media query so it shrinks sensibly on
  mobile), real `alt="Stem With Ashley logo"`.
- The existing text brand link stays (for accessibility and because the logo image has
  no transparency/won't read well as a tiny favicon-style mark) — image + text together,
  not image replacing text.
- Also used as the favicon (`<link rel="icon">`), since it's the only real brand asset
  available and the brief asks for it "throughout the app."

## Job Finder (`/jobs/`)

Self-contained sub-application, own folder, no shared JS with the roadmap app:

```
stem-with-ashley/
  jobs/
    index.html        # standalone entry point, own <head>, links back to root site
    jobs-app.js        # own render/filter/router logic
    jobs-data.js        # sample listings — clearly marked as sample data, isolated module
    jobs.css             # imports/duplicates the root CSS custom properties for visual
                          # consistency, plus job-finder-specific component styles
```

- **Filters**: STEM field/category (reusing the same field list as the roadmap for
  consistency), keyword/role search, experience level (Internship / New Grad / 1-3
  years), location or Remote.
- **Data layer**: `jobs-data.js` exports a plain array of sample listings, each object
  clearly containing `"isSampleData": true` and the UI displays a visible banner ("Sample
  listings for demo purposes — see comments in jobs-data.js for how to wire up a real
  feed") — no fabricated listings presented as real.
- **Future integration path** (documented in a comment block at the top of
  `jobs-data.js`, not built this round): USAJOBS.gov's public API is the most realistic
  free option (free registration, no paid tier, official government listings — a
  reasonable fit for early-career STEM roles) if Ashley wants live data later.
- **Cross-linking**: roadmap app gets a new persistent link ("Find a Job →") in the
  header nav and the new Resources page; the Job Finder's header links back to the
  roadmap (`../index.html`).
- Visual language reused from the root `styles.css` custom properties (`--brand`,
  `--surface`, `--radius`, etc.) so it reads as the same product, while remaining a
  separately deployable/movable unit if it ever needs to leave this repo.

## Career Quiz Selection

**O\*NET Interest Profiler** (via `mynextmove.org/explore/ip`), operated by the U.S.
Department of Labor. Chosen over alternatives because it's:
- Free, no login, no lead-gen/email harvesting.
- Backed by a federal agency, not a marketing funnel.
- Actually used by university career centers (confirmed via search — multiple `.edu`
  career-center pages link students directly to it).
- Maps results to 900+ real occupations with concrete salary/outlook data via My Next
  Move, rather than giving a vague personality label.

No custom matching algorithm is built — this is a link-out with a short explainer, per
Ashley's explicit instruction to link an existing resource instead.

## Verification Method (for all new external links: media + quiz)

Before any external URL is added to the data file:
1. Fetch the URL to confirm it resolves (not dead/redirecting to an error page).
2. Confirm the page's actual title/content matches the claimed content (e.g. a YouTube
   video claimed to be "day in the life of a civil engineer" actually shows that).
3. Prefer established channels/publishers over single-upload low-view content where
   multiple reasonable options exist.

## Responsiveness & Accessibility

- Extend the existing mobile-first CSS custom-property system in `styles.css` (no new
  framework). New components (majors grid/detail, resources list, header logo, job
  finder cards/filters) follow the same card/grid patterns already used for Fields.
- Checked at desktop, tablet, and mobile widths for overflow, wrapping, and tap-target
  size, including the job finder's filter controls.
- Accessibility basics maintained: semantic headings, descriptive link text (no "click
  here"), alt text on the logo, labeled form controls in the job finder filters,
  keyboard operability (all interactive elements are real `<a>`/`<button>`/`<input>`
  elements, consistent with the existing codebase), visible focus states, and contrast
  consistent with the existing design tokens.

## Handoff / Maintainability

- All new content (majors, resources, media links) lives in the same
  `data/roadmap-data.json` Ashley already edits — no new file for her to learn.
- `data/README.md` gets new sections, in the same plain-language style as the existing
  ones: how to add a major, how to add a resource, how to add a podcast/YouTube link to
  a field, how to add a sample job listing (with a clear note that job listings are
  separate/sample and not meant for her to hand-maintain unless she wants to).
- Root `README.md` updated to mention the new routes and the `/jobs/` sub-app.
- No build step, linter, or test suite is introduced (none exists today — this is
  intentionally a zero-dependency static site). Verification is: valid JSON, working
  links, and manual in-browser QA across viewport sizes, done before considering the
  round complete.

## Testing / Verification Plan

- `roadmap-data.json` validated as syntactically correct JSON after edits.
- Every new external URL (media links, quiz link, USAJOBS mention) checked as described
  above.
- Manual in-browser walkthrough: Majors grid → major detail → link into Field page;
  Resources page → quiz link opens correctly; Field page → media links open correctly;
  header logo renders and scales at multiple widths; Job Finder reachable both directly
  (`/jobs/`) and via the roadmap's nav/Resources link, filters function, sample-data
  banner is visible; back-link from Job Finder to roadmap works.
- Desktop, tablet, and mobile viewport check for every new/changed page.

## Out of Scope (explicit, per Ashley)

- Interview simulator (future scoping/documentation only, not this round).
- Resume builder.
- Calculator.
- PowerPoint usage guide / Word interview-simulator outline (next week's deliverables).
- Live/paid job-listing API integration (documented path only, sample data this round).
- Custom career-matching algorithm (existing quiz is linked instead).
