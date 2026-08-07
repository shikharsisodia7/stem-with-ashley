# STEM Career Roadmap ("Stem-With-Ashley") — Design Spec

Date: 2026-08-06

## Purpose

A self-contained web app for recent college graduates entering STEM careers, letting
them explore realistic five-year pathways from entry-level to senior roles (specialist,
fellow, VP, etc.) across 10 STEM fields, plus a cross-field developmental skills
section. Users can bookmark items of interest into a printable shortlist to bring into
a career-coach conversation.

This is a working prototype ("functional, not polished") that must be maintainable
indefinitely by a non-technical person (Ashley) with no backend, no paid services, and
no build step to break.

## Field List (10, locked)

Chosen for a genuine mix of engineering and medical/health-science tracks, each with a
distinct industry and a realistic corporate-style (not licensure/residency-based)
career ladder:

1. Aerospace Engineering
2. Mechanical Engineering
3. Civil Engineering
4. Electrical Engineering
5. Computer Science / Software Engineering
6. Chemical Engineering
7. Data Science & Statistics
8. Biomedical Engineering
9. Biotechnology / Pharmaceutical Sciences
10. Public Health & Epidemiology

Plus one cross-field **Developmental Skills** section (public speaking, time
management, communication, etc.), each skill listing a few named resources (e.g.
Toastmasters), no hyperlinks required.

## Data Architecture

Single hand-editable data file, separate from app logic, so Ashley never needs to touch
code to update content:

- `data/roadmap-data.json` — all field and skill data.
- `data/README.md` — plain-language editing guide for Ashley (how to edit a field, how
  to duplicate a field block to add a new one, how to add/edit a skill).

### Schema

```jsonc
{
  "fields": [
    {
      "id": "aerospace-engineering",       // URL-safe slug, must be unique
      "name": "Aerospace Engineering",
      "summary": "One-line description shown on the home page card.",
      "pathway": [
        // 4 steps: entry -> 2 intermediate -> senior, spanning ~5 years
        { "level": 1, "title": "...", "yearRange": "0-1", "description": "..." },
        { "level": 2, "title": "...", "yearRange": "1-3", "description": "..." },
        { "level": 3, "title": "...", "yearRange": "3-5", "description": "..." },
        { "level": 4, "title": "...", "yearRange": "5+",  "description": "..." }
      ],
      "companies": ["...", "..."],          // real companies known for hiring in this field
      "certifications": [
        { "name": "...", "provider": "..." }
      ],
      "mastersPrograms": [
        { "name": "...", "schools": ["...", "..."] }
      ],
      "conferences": ["..."],
      "organizations": ["..."]
    }
    // ...9 more field objects, same shape
  ],
  "skills": [
    { "name": "Public Speaking", "resources": ["Toastmasters", "..."] }
    // ...more skills
  ]
}
```

Each field object is fully self-contained; Ashley adds a field by copying an existing
block and editing the values (README documents this explicitly).

## App Structure

Plain static site — vanilla HTML/CSS/JS, no framework, no build step, no npm
dependency to go stale. Single-page app with hash-based routing so it works as static
files with zero server logic:

- `#/` — **Home**: grid of 10 field cards (name + summary), click through to detail.
- `#/field/<id>` — **Field detail**: visual step pathway (entry → senior) as an
  expandable stepper; sections below for Companies, Certifications & Master's
  Programs, Conferences & Organizations. Bookmark star on the field itself and on each
  pathway step / cert / program / conference / org.
- `#/skills` — **Skills browser**: list of developmental skills, each expandable to
  show its named resources, with bookmark stars.
- `#/shortlist` — **My Shortlist**: everything bookmarked, grouped by field/skill, with
  a "Print / Save as PDF" button. A `@media print` stylesheet hides nav/chrome so the
  printed/saved output is clean enough to hand to a career coach.

### State

Bookmarks live in `localStorage` as a simple array of reference objects
(`{ type, fieldId, itemId }`). No backend, no accounts. Resets if the user clears
browser storage — acceptable for a prototype.

### Files

```
stem-with-ashley/
  index.html
  styles.css
  app.js              # rendering, hash routing, bookmark logic
  data/
    roadmap-data.json
    README.md         # Ashley's editing guide
  docs/
    superpowers/specs/...
  README.md           # repo-root: setup + deploy + "how Ashley edits this" walkthrough notes
```

## Research Methodology

Data is compiled via parallel research agents (one per field, web-search-enabled),
each tasked with producing a realistic 4-step pathway, real named companies, real
certifications/master's programs with real host schools, and real
conferences/professional organizations for that field — grounded in actual industry
practice rather than generic filler. Outputs are reviewed for accuracy and consistency
before being merged into the final JSON. The cross-field skills section is compiled
directly (well-known resources by name, e.g. Toastmasters for public speaking).

## Deployment & Handoff

- Plain static site, pushed to a new GitHub repo, imported into Vercel as a **static
  site** (no framework preset, no build command). Every `git push` auto-redeploys.
- Vercel project name: `stem-with-ashley`.
- Root `README.md` gives Ashley plain-language, step-by-step instructions: how to open
  and edit `data/roadmap-data.json`, how to duplicate a field block to add a new field,
  how to commit and push, and how that shows up live on Vercel. This is the file to
  point to when recording her walkthrough.

## Testing

- Manual verification in-browser (not just "file opens") of: field navigation, pathway
  stepper expand/collapse, bookmarking across all four bookmark types, shortlist
  aggregation, print/PDF output, and localStorage persistence across a page reload.
- Spot-check a sample of researched data points (a few companies/certs per field) for
  plausibility before considering the data set final.

## Out of Scope

- Accounts, logins, or any backend/database.
- Salary data, job-market statistics, or any information requiring ongoing refresh to
  stay accurate.
- Hyperlinks for skills resources (names only, per requirements).
- Mobile-specific redesign (should be usable on mobile via responsive CSS, but no
  bespoke mobile flows).
