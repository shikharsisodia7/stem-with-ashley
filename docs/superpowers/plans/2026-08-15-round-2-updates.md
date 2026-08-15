# Stem-With-Ashley Round 2 Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a majors explorer, a resources page (with the O\*NET career quiz), verified podcast/YouTube "day in the life" links per field, the real Stem-With-Ashley logo, and a standalone job finder sub-app to the existing static roadmap site, without breaking Fields/Skills/Shortlist.

**Architecture:** Same zero-build vanilla HTML/CSS/JS static site as round 1. New content (majors, resources, per-field media) lives in the existing hand-editable `data/roadmap-data.json`, rendered by new functions added to the existing hash-router in `app.js`. The job finder is a self-contained sibling app under `jobs/` with its own HTML/JS/CSS/data files that doesn't import `app.js`, cross-linked via plain `<a href>` (not hash routing, since it's a separate page).

**Tech Stack:** Vanilla HTML/CSS/JS, no framework, no bundler, no npm dependency. Node's built-in test runner (`node --test`, ships with Node 18+, zero install) is used only for the one piece of genuinely pure logic (job filtering) — everything else is verified by manual in-browser QA, consistent with round 1's testing approach.

## Global Constraints

- No build step, no framework, no new npm dependency, no `package.json` — plain `<script src="...">` tags only, same as the existing `app.js`/`index.html`.
- All new user-facing content (majors, resources, media links) lives in `data/roadmap-data.json`, editable the same way Ashley already edits fields/skills.
- Every external URL added to the data file must have been actually verified (resolves, content matches the claim) before being added — never guessed.
- No paid APIs, no private API keys. The job finder ships with sample data only, clearly labeled as sample (`isSampleData: true` + visible UI banner + `(sample)` suffix on company names).
- Do not build: interview simulator, resume builder, calculator, PowerPoint usage guide, Word interview-simulator outline. Out of scope this round.
- Existing routes/features (`#/`, `#/field/<id>`, `#/skills`, `#/shortlist`, bookmarking, print/PDF) must keep working unchanged.
- Accessibility basics on every new page: semantic headings, descriptive link text, alt text on the logo, labeled form controls, real focus-able elements (`<a>`/`<button>`/`<input>`/`<select>`), contrast consistent with existing `--text`/`--text-muted` tokens.
- Source spec: `docs/superpowers/specs/2026-08-15-round-2-updates-design.md`.

---

## Task 1: Majors + Resources data model

**Files:**
- Modify: `data/roadmap-data.json:287-289` (end of file, after the `skills` array)
- Modify: `data/README.md` (append new sections)

**Interfaces:**
- Produces: `ROADMAP_DATA.majors` — array of `{ id, name, summary, typicalCourses: string[], whyChooseIt, leadsToFields: string[] }`. `leadsToFields` entries must match an existing `fields[].id`.
- Produces: `ROADMAP_DATA.resources` — array of `{ title, url, provider, description }`.

- [ ] **Step 1: Edit `data/roadmap-data.json`**

The current file ends (lines 287-289):

```json
    { "name": "Personal Branding & Career Development", "resources": ["\"Designing Your Life\" by Bill Burnett & Dave Evans", "LinkedIn Learning career-development courses", "University career center / alumni mentorship programs"] }
  ]
}
```

Replace those 3 lines with:

```json
    { "name": "Personal Branding & Career Development", "resources": ["\"Designing Your Life\" by Bill Burnett & Dave Evans", "LinkedIn Learning career-development courses", "University career center / alumni mentorship programs"] }
  ],
  "majors": [
    {
      "id": "aerospace-engineering-major",
      "name": "Aerospace Engineering",
      "summary": "Aerospace engineering blends physics, math, and materials science to design aircraft, spacecraft, and the propulsion systems that get them off the ground.",
      "typicalCourses": ["Calculus I-III", "Differential Equations", "Statics & Dynamics", "Aerodynamics", "Propulsion Systems", "Aircraft/Spacecraft Structures", "Flight Mechanics & Controls"],
      "whyChooseIt": "A strong fit for students who love physics and want to work on flight, space exploration, or defense systems, and who don't mind a rigorous, math-heavy curriculum.",
      "leadsToFields": ["aerospace-engineering"]
    },
    {
      "id": "mechanical-engineering-major",
      "name": "Mechanical Engineering",
      "summary": "One of the broadest engineering majors, covering how physical systems move, generate power, and get manufactured — from engines to robots to consumer products.",
      "typicalCourses": ["Statics", "Dynamics", "Thermodynamics", "Fluid Mechanics", "Materials Science", "Mechanics of Materials", "Machine Design", "Heat Transfer"],
      "whyChooseIt": "Good for students who like hands-on building and want maximum flexibility after graduation — mechanical engineers work across nearly every industry.",
      "leadsToFields": ["mechanical-engineering"]
    },
    {
      "id": "civil-engineering-major",
      "name": "Civil Engineering",
      "summary": "Civil engineering trains students to design and build the infrastructure society depends on: roads, bridges, water systems, and buildings.",
      "typicalCourses": ["Statics", "Structural Analysis", "Geotechnical Engineering (Soil Mechanics)", "Fluid Mechanics & Hydraulics", "Construction Materials", "Surveying", "Transportation Engineering"],
      "whyChooseIt": "Appeals to students who want to see tangible, lasting results in the world around them and who are interested in a clear path toward professional licensure (PE).",
      "leadsToFields": ["civil-engineering"]
    },
    {
      "id": "electrical-engineering-major",
      "name": "Electrical Engineering",
      "summary": "Electrical engineering covers the systems that generate, distribute, and control electricity and signals — from microchips to the power grid.",
      "typicalCourses": ["Circuit Analysis", "Electromagnetics", "Digital Logic Design", "Signals & Systems", "Semiconductor Devices", "Power Systems", "Control Systems"],
      "whyChooseIt": "A strong choice for students drawn to both hardware and theory, with career paths spanning chips, power, robotics, and communications.",
      "leadsToFields": ["electrical-engineering"]
    },
    {
      "id": "computer-science-major",
      "name": "Computer Science",
      "summary": "Computer science teaches how to design, build, and reason about software systems — the algorithms, data structures, and infrastructure behind modern technology.",
      "typicalCourses": ["Data Structures & Algorithms", "Discrete Mathematics", "Computer Architecture", "Operating Systems", "Databases", "Software Engineering", "Computer Networks"],
      "whyChooseIt": "Great for students who enjoy problem-solving and building things quickly, with some of the widest range of industries hiring straight out of undergrad.",
      "leadsToFields": ["computer-science-software-engineering"]
    },
    {
      "id": "chemical-engineering-major",
      "name": "Chemical Engineering",
      "summary": "Chemical engineering applies chemistry, physics, and math to design the processes that turn raw materials into fuels, chemicals, and pharmaceuticals at scale.",
      "typicalCourses": ["General & Organic Chemistry", "Thermodynamics", "Fluid Mechanics", "Mass & Heat Transfer", "Chemical Reaction Engineering", "Process Design & Control", "Separations"],
      "whyChooseIt": "Fits students who like chemistry but want to work on large-scale industrial processes rather than lab bench research alone.",
      "leadsToFields": ["chemical-engineering"]
    },
    {
      "id": "statistics-data-science-major",
      "name": "Statistics / Data Science",
      "summary": "This major builds the math, programming, and modeling skills to turn raw data into predictions and decisions.",
      "typicalCourses": ["Calculus & Linear Algebra", "Probability Theory", "Mathematical Statistics", "Regression Analysis", "Machine Learning", "Databases & SQL", "Experimental Design"],
      "whyChooseIt": "A good fit for students who like math and want it applied to real business or scientific questions rather than pure theory.",
      "leadsToFields": ["data-science-statistics"]
    },
    {
      "id": "biomedical-engineering-major",
      "name": "Biomedical Engineering",
      "summary": "Biomedical engineering applies engineering principles to the human body, training students to design medical devices, diagnostics, and health technologies.",
      "typicalCourses": ["Biology & Human Physiology", "Circuits", "Biomechanics", "Biomaterials", "Medical Instrumentation", "Biosignal Processing", "Medical Device Design"],
      "whyChooseIt": "Ideal for students who want an engineering career with a direct, tangible connection to healthcare and human impact.",
      "leadsToFields": ["biomedical-engineering"]
    },
    {
      "id": "biology-biochemistry-major",
      "name": "Biology / Biochemistry",
      "summary": "A life-sciences major covering the chemistry and biology of living systems, the standard entry point into bench science and biotech/pharma careers.",
      "typicalCourses": ["General & Organic Chemistry", "Cell Biology", "Genetics", "Molecular Biology", "Biochemistry", "Microbiology", "Laboratory Techniques"],
      "whyChooseIt": "A natural fit for students who enjoyed high school biology/chemistry and want to work in a lab turning scientific discoveries into real therapies.",
      "leadsToFields": ["biotechnology-pharmaceutical-sciences"]
    },
    {
      "id": "public-health-major",
      "name": "Public Health",
      "summary": "Public health majors study how to protect and improve population-level health through data, policy, and programs, rather than treating individual patients.",
      "typicalCourses": ["Biostatistics", "Epidemiology", "Environmental Health", "Health Policy & Management", "Social & Behavioral Health Sciences", "Global Health", "Research Methods"],
      "whyChooseIt": "Good for students who care about health but want to work on prevention and systems-level impact rather than clinical practice.",
      "leadsToFields": ["public-health-epidemiology"]
    }
  ],
  "resources": [
    {
      "title": "O*NET Interest Profiler",
      "url": "https://www.mynextmove.org/explore/ip",
      "provider": "U.S. Department of Labor",
      "description": "Free ~20-minute interest assessment based on the RIASEC model. Maps your answers to 900+ real occupations with salary and outlook data — a good starting point if you're not sure which STEM field fits you yet."
    }
  ]
}
```

(This URL was verified in the design phase: it 301-redirects to `onetinterestprofiler.org`, the official O\*NET Interest Profiler run by the U.S. Dept. of Labor's National Center for O\*NET Development — a live, legitimate resource, not a dead link.)

- [ ] **Step 2: Validate the JSON is syntactically correct**

Run: `python -c "import json; json.load(open(r'data/roadmap-data.json', encoding='utf-8')); print('valid')"`
Expected: `valid` printed, no exception.

- [ ] **Step 3: Spot-check the new arrays loaded correctly**

Run: `python -c "import json; d=json.load(open(r'data/roadmap-data.json', encoding='utf-8')); print(len(d['majors']), len(d['resources'])); print([m['id'] for m in d['majors']])"`
Expected: `10 1` followed by a list of the 10 major ids above, no `KeyError`.

- [ ] **Step 4: Update `data/README.md`**

Append these two new sections at the end of the file (after the existing "If the site breaks after an edit" section):

```markdown

## Adding a new major

Majors live in the `"majors"` list near the end of the file, after `"skills"`. Each one
looks like:

```
{
  "id": "your-major-slug",
  "name": "Your Major Name",
  "summary": "One-line description for the majors grid card.",
  "typicalCourses": ["Course 1", "Course 2", "..."],
  "whyChooseIt": "A sentence or two on what draws students to this major.",
  "leadsToFields": ["matching-field-id"]
}
```

Copy an existing major block, edit every value, and give it a unique `"id"`. The
`"leadsToFields"` list must contain the `"id"` of an existing field from the `"fields"`
list above (e.g. `"mechanical-engineering"`) — that's what makes the "Careers this leads
to" links on the major's page work.

## Adding a new resource

Resources live in the `"resources"` list at the very end of the file:

```
{ "title": "Resource Name", "url": "https://...", "provider": "Who runs it", "description": "One sentence on what it helps a student figure out." }
```

Copy the existing O*NET entry and edit the values. Always test the URL in a browser
before saving.
```

- [ ] **Step 5: Commit**

```bash
git add data/roadmap-data.json data/README.md
git commit -m "Add majors and resources data model"
```

---

## Task 2: Majors pages (grid + detail)

**Files:**
- Modify: `app.js:66-93` (add new render functions near `renderHome`)
- Modify: `app.js:298-334` (`render()` router)
- Modify: `index.html:10-17` (nav)

**Interfaces:**
- Consumes: `ROADMAP_DATA.majors`, `ROADMAP_DATA.fields` (from Task 1), `esc()` (existing, `app.js:10-14`).
- Produces: `renderMajors()`, `renderMajorDetail(majorId)` — both return HTML strings, called from the router exactly like the existing `renderHome()`/`renderField()`.

- [ ] **Step 1: Add the render functions to `app.js`**

Insert immediately after the closing `}` of `renderHome()` (i.e. right before the existing `function renderField(fieldId) {` at `app.js:95`):

```js
function renderMajors() {
  const cards = ROADMAP_DATA.majors
    .map((m) => `
      <div class="field-card">
        <a class="field-card-link" href="#/major/${esc(m.id)}">
          <h3>${esc(m.name)}</h3>
          <p>${esc(m.summary)}</p>
        </a>
      </div>`)
    .join("");

  return `
    <h1>Explore a STEM major</h1>
    <p>Haven't picked a major yet? Browse what each one actually involves and see the careers it leads to.</p>
    <div class="field-grid">${cards}</div>`;
}

function renderMajorDetail(majorId) {
  const major = ROADMAP_DATA.majors.find((m) => m.id === majorId);
  if (!major) {
    return `<p><a class="back-link" href="#/majors">&larr; Back to all majors</a></p><p>Major not found.</p>`;
  }

  const courseChips = major.typicalCourses
    .map((c) => `<span class="chip">${esc(c)}</span>`)
    .join("");

  const fieldLinks = major.leadsToFields
    .map((fieldId) => {
      const field = ROADMAP_DATA.fields.find((f) => f.id === fieldId);
      if (!field) return "";
      return `<div class="item-row"><div class="item-text item-title"><a href="#/field/${esc(field.id)}">${esc(field.name)}</a></div></div>`;
    })
    .join("");

  return `
    <a class="back-link" href="#/majors">&larr; Back to all majors</a>
    <h1>${esc(major.name)}</h1>
    <p>${esc(major.summary)}</p>

    <h2>Why students choose it</h2>
    <p>${esc(major.whyChooseIt)}</p>

    <h2>Typical courses</h2>
    <div class="chip-list">${courseChips}</div>

    <h2>Careers this leads to</h2>
    ${fieldLinks || `<p class="empty-state">No linked careers yet.</p>`}
  `;
}
```

- [ ] **Step 2: Wire the routes into `render()`**

In `app.js`, the existing router (around line 314-330) reads:

```js
  if (hash === "/") {
    app.innerHTML = renderHome();
    updateNavActive("/");
  } else if (hash.startsWith("/field/")) {
```

Insert two new branches between those, so it becomes:

```js
  if (hash === "/") {
    app.innerHTML = renderHome();
    updateNavActive("/");
  } else if (hash === "/majors") {
    app.innerHTML = renderMajors();
    updateNavActive("/majors");
  } else if (hash.startsWith("/major/")) {
    const id = decodeURIComponent(hash.slice("/major/".length));
    app.innerHTML = renderMajorDetail(id);
    updateNavActive("");
  } else if (hash.startsWith("/field/")) {
```

- [ ] **Step 3: Add the nav link in `index.html`**

Change (line 12-16):

```html
    <nav class="site-nav">
      <a href="#/" data-route="/">Fields</a>
      <a href="#/skills" data-route="/skills">Skills</a>
      <a href="#/shortlist" data-route="/shortlist">My Shortlist <span id="shortlist-count" class="badge"></span></a>
    </nav>
```

to:

```html
    <nav class="site-nav">
      <a href="#/" data-route="/">Fields</a>
      <a href="#/majors" data-route="/majors">Majors</a>
      <a href="#/skills" data-route="/skills">Skills</a>
      <a href="#/shortlist" data-route="/shortlist">My Shortlist <span id="shortlist-count" class="badge"></span></a>
    </nav>
```

- [ ] **Step 4: Manually verify in-browser**

Run: `python -m http.server 8000` from `stem-with-ashley/`, open `http://localhost:8000/`.
Expected: "Majors" appears in the nav and highlights active on click; `#/majors` shows a grid of 10 major cards; clicking one shows its detail page with course chips and a working link into the matching Field page (e.g. Mechanical Engineering major → Mechanical Engineering field); the back link returns to the majors grid; existing Fields/Skills/Shortlist still work unchanged.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html
git commit -m "Add Majors section (grid + detail pages)"
```

---

## Task 3: Resources page

**Files:**
- Modify: `app.js:66-93` (add `renderResources()`)
- Modify: `app.js:298-334` (router)
- Modify: `index.html:10-17` (nav)
- Modify: `styles.css:124-136` (small `.item-row` tweak)

**Interfaces:**
- Consumes: `ROADMAP_DATA.resources` (Task 1), `esc()`.
- Produces: `renderResources()` — HTML string, called from router.
- Note: this task's page links to `jobs/`, which doesn't exist until Task 7. That link will 404 until then — expected and fine mid-plan; verify it once Task 7 lands (covered in Task 8).

- [ ] **Step 1: Add `renderResources()` to `app.js`**

Insert right after `renderMajorDetail()` from Task 2 (before `function renderField(fieldId) {`):

```js
function renderResources() {
  const rows = ROADMAP_DATA.resources
    .map((r) => `
      <div class="item-row">
        <div class="item-text">
          <div class="item-title"><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a></div>
          <div class="item-sub">${esc(r.provider)}</div>
          <p>${esc(r.description)}</p>
        </div>
      </div>`)
    .join("");

  return `
    <h1>Resources</h1>
    <p>Extra tools to help you plan your STEM career.</p>
    ${rows}

    <h2>Looking for a job?</h2>
    <p>Once you're ready to search for roles, check out the <a href="jobs/">Job Finder</a> — filter open STEM roles by field, experience level, and location.</p>
  `;
}
```

- [ ] **Step 2: Wire the route into `render()`**

Directly after the `/skills` branch added in round 1 (currently `app.js:321-323`):

```js
  } else if (hash === "/skills") {
    app.innerHTML = renderSkills();
    updateNavActive("/skills");
```

add a new branch right after it:

```js
  } else if (hash === "/skills") {
    app.innerHTML = renderSkills();
    updateNavActive("/skills");
  } else if (hash === "/resources") {
    app.innerHTML = renderResources();
    updateNavActive("/resources");
```

- [ ] **Step 3: Add the nav link in `index.html`**

Extend the nav from Task 2 to:

```html
    <nav class="site-nav">
      <a href="#/" data-route="/">Fields</a>
      <a href="#/majors" data-route="/majors">Majors</a>
      <a href="#/skills" data-route="/skills">Skills</a>
      <a href="#/resources" data-route="/resources">Resources</a>
      <a href="#/shortlist" data-route="/shortlist">My Shortlist <span id="shortlist-count" class="badge"></span></a>
    </nav>
```

- [ ] **Step 4: Tidy `.item-row` paragraph spacing in `styles.css`**

The resources page puts a `<p>` inside `.item-text`, which doesn't have a rule yet. Add right after the existing block ending at `styles.css:135`:

```css
.item-row .item-text p { margin: 0.4rem 0 0; color: var(--text-muted); font-size: 0.92rem; }
```

- [ ] **Step 5: Manually verify in-browser**

Reload `http://localhost:8000/#/resources`.
Expected: "Resources" nav link works and highlights active; the O\*NET Interest Profiler card renders with working title link (opens in a new tab), provider, and description; the "Job Finder" link is present (will 404 until Task 7 — expected for now).

- [ ] **Step 6: Commit**

```bash
git add app.js index.html styles.css
git commit -m "Add Resources page with O*NET career quiz link"
```

---

## Task 4: Real logo integration

**Files:**
- Modify: `index.html:3-11` (head + header)
- Modify: `styles.css:40-45` (`.brand`)
- Existing: `assets/logo.jpeg` (already saved and committed — verified match of the real Google Drive asset)

**Interfaces:**
- No JS interfaces — pure HTML/CSS.

- [ ] **Step 1: Add favicon link and update the header markup in `index.html`**

Change the `<head>` (lines 3-7):

```html
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stem With Ashley — Five-Year STEM Career Roadmap</title>
  <link rel="stylesheet" href="styles.css" />
</head>
```

to:

```html
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stem With Ashley — Five-Year STEM Career Roadmap</title>
  <link rel="icon" type="image/jpeg" href="assets/logo.jpeg" />
  <link rel="stylesheet" href="styles.css" />
</head>
```

Change the brand link (line 11):

```html
    <a class="brand" href="#/">Stem&nbsp;With&nbsp;Ashley</a>
```

to:

```html
    <a class="brand" href="#/">
      <img class="brand-logo" src="assets/logo.jpeg" alt="Stem With Ashley logo" width="40" height="40" />
      <span>Stem&nbsp;With&nbsp;Ashley</span>
    </a>
```

- [ ] **Step 2: Style the logo in `styles.css`**

Replace the existing `.brand` rule (lines 40-45):

```css
.brand {
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--text);
}
.brand:hover { text-decoration: none; }
```

with:

```css
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--text);
}
.brand:hover { text-decoration: none; }
.brand-logo {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  object-fit: cover;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
}
@media (max-width: 480px) {
  .brand-logo { width: 1.75rem; height: 1.75rem; }
}
```

- [ ] **Step 3: Manually verify in-browser**

Reload `http://localhost:8000/`. Resize the window to ~1280px, ~768px, and ~375px wide.
Expected: circular logo thumbnail renders next to "Stem With Ashley" text at all three widths, keeps a 1:1 aspect ratio (no squish/stretch), shrinks slightly on the narrowest width, doesn't cause the header to wrap awkwardly or overflow horizontally; browser tab shows the logo as the favicon.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add real Stem With Ashley logo to header and favicon"
```

---

## Task 5: Verified podcast/YouTube links per field

**Files:**
- Modify: `data/roadmap-data.json` (add `"media"` to each of the 10 field objects)
- Modify: `app.js:95-226` (`renderField()` — add media block)
- Modify: `styles.css` (small `.media-list` rule)
- Modify: `data/README.md` (append editing instructions)

**Interfaces:**
- Consumes: `esc()`.
- Produces: `field.media` — array of `{ type: "youtube"|"podcast", title, url, description }`, used by `renderField()`.

All 20 links below were individually verified (YouTube oEmbed lookup confirming the video is live and its real title/channel; direct page fetch confirming podcast pages are live and match the claimed content) before being included — none are guessed.

- [ ] **Step 1: Add a `"media"` array to each field in `data/roadmap-data.json`**

For each field listed below, insert a `"media": [...]` property immediately after that field's existing `"organizations"` array (i.e. as the new last property before the field's closing `}`), adding a trailing comma to the end of the `"organizations"` line. Match by the field's `"id"` — do not rely on line numbers shifting after Task 1's edit (Task 1 only appends after the `skills` array, so these positions are unaffected).

**`aerospace-engineering`** (after its `"organizations"` array, `data/roadmap-data.json:28`):
```json
      "media": [
        { "type": "youtube", "title": "Day In My Life as a NASA Engineer", "url": "https://www.youtube.com/watch?v=IaEv63ut6fU", "description": "A NASA JPL aerospace/electrical engineer walks through a real day of her engineering work and life." },
        { "type": "podcast", "title": "The Aerospace Engineering Podcast", "url": "https://podcasts.apple.com/us/podcast/the-aerospace-engineering-podcast/id1299428170", "description": "Interview-format show featuring conversations with aerospace engineers about their careers and technical work." }
      ]
```

**`mechanical-engineering`** (after `data/roadmap-data.json:55`):
```json
      "media": [
        { "type": "youtube", "title": "Day in the Life of a Mechanical Engineer | Factory Life", "url": "https://www.youtube.com/watch?v=EXI3uQCxP38", "description": "A mechanical engineer who helped build a battery gigafactory shows a real factory-floor workday." },
        { "type": "podcast", "title": "Being an Engineer — Tony Kelbert", "url": "https://podcasts.apple.com/us/podcast/being-an-engineer/id1508222292", "description": "Established engineering-career podcast interviewing a mechanical engineer/manufacturing strategist about his career." }
      ]
```

**`civil-engineering`** (after `data/roadmap-data.json:83`):
```json
      "media": [
        { "type": "youtube", "title": "An ACTUAL Day In The Life of a CIVIL ENGINEER. Construction Site Engineer.", "url": "https://www.youtube.com/watch?v=G-j39crM4mc", "description": "A real construction site engineer walks through an actual workday in the UK." },
        { "type": "podcast", "title": "TCEP 311: Developing Leadership Skills In Civil Engineering", "url": "https://engineeringmanagementinstitute.org/tcep-311-developing-leadership-skills-in-civil-engineering/", "description": "Episode of The Civil Engineering Podcast on building leadership and communication skills as a practicing civil engineer." }
      ]
```

**`electrical-engineering`** (after `data/roadmap-data.json:110`):
```json
      "media": [
        { "type": "youtube", "title": "What is it like to be an Electrical Engineer? | Day in the Life", "url": "https://www.youtube.com/watch?v=KLBzEnVMPDE", "description": "An official manufacturer channel follows an electrical engineer through a real day at the company." },
        { "type": "podcast", "title": "The Amp Hour Electronics Podcast", "url": "https://podcasts.apple.com/us/podcast/the-amp-hour-electronics-podcast/id386547290", "description": "Long-running weekly show discussing electronics design work and engineering careers with real hardware engineers." }
      ]
```

**`computer-science-software-engineering`** (after `data/roadmap-data.json:138`):
```json
      "media": [
        { "type": "youtube", "title": "A Day in the Life Series: Justin Ridings, Software Engineer at Microsoft", "url": "https://www.youtube.com/watch?v=J7mCQC4e3eA", "description": "Official Microsoft channel profile of a working software engineer showing his actual workday." },
        { "type": "podcast", "title": "Software Engineering Daily", "url": "https://podcasts.apple.com/us/podcast/software-engineering-daily/id1019576853", "description": "Established daily interview show with practicing software engineers about real engineering work and career paths." }
      ]
```

**`chemical-engineering`** (after `data/roadmap-data.json:166`):
```json
      "media": [
        { "type": "youtube", "title": "On My Way: A Day in the Life of a Process Engineer", "url": "https://www.youtube.com/watch?v=4EbPykh_bmo", "description": "A government career series follows a real process/chemical engineer through a workday." },
        { "type": "podcast", "title": "CE Podcast: Guest Greg Schinkel discusses engineering career paths and leadership skills", "url": "https://www.chemengonline.com/ce-podcast-guest-greg-schinkel-discusses-engineering-career-paths-and-leadership-skills/", "description": "Chemical Engineering magazine's official podcast on career paths open to chemical engineers." }
      ]
```

**`data-science-statistics`** (after `data/roadmap-data.json:194`):
```json
      "media": [
        { "type": "youtube", "title": "A Day in The Life of a Google Data Scientist (Analytics)", "url": "https://www.youtube.com/watch?v=CSdpk6NzvhY", "description": "A senior analytics lead at Google shows a real day working as a data scientist." },
        { "type": "podcast", "title": "DataFramed: How to Have a Machine Learning Career in 2026", "url": "https://www.datacamp.com/podcast/how-to-have-a-data-science-career-in-2026", "description": "DataCamp's podcast interviews a working ML/data scientist about the data science job, interviewing, and career growth." }
      ]
```

**`biomedical-engineering`** (after `data/roadmap-data.json:221`):
```json
      "media": [
        { "type": "youtube", "title": "On My Way: A Day in the Life of a Biomedical Engineer", "url": "https://www.youtube.com/watch?v=oMtn1XXyDyA", "description": "A government career series follows a real biomedical engineer keeping hospital medical devices running." },
        { "type": "podcast", "title": "Office Hours Episode 9: What Comes After Graduation? Finding Your Path in Biomedical Engineering", "url": "https://www.bmes.org/podcast/officehours/episode9", "description": "BMES's official podcast on the path from bioengineering study to a biopharmaceutical industry career." }
      ]
```

**`biotechnology-pharmaceutical-sciences`** (after `data/roadmap-data.json:247`):
```json
      "media": [
        { "type": "youtube", "title": "Day in the Life at Amgen: Dymond", "url": "https://www.youtube.com/watch?v=X3v37y2KZSo", "description": "Official Amgen company channel follows a biotech professional through her real workday at the pharmaceutical company." },
        { "type": "podcast", "title": "The Biotech Startups Podcast", "url": "https://podcasts.apple.com/us/podcast/the-biotech-startups-podcast/id1679591994", "description": "Interviews with biotech/pharma scientists and founders about building drug-discovery and life-sciences careers." }
      ]
```

**`public-health-epidemiology`** (after `data/roadmap-data.json:274` — this is the last field, so no trailing comma changes elsewhere are needed beyond this field's own `"organizations"` line):
```json
      "media": [
        { "type": "youtube", "title": "Public Health Careers: Epidemiologist, Part 1", "url": "https://www.youtube.com/watch?v=tYx-fO5hMA4", "description": "Official CDC channel video in which a CDC epidemiologist describes his real day-to-day work studying how diseases affect populations." },
        { "type": "podcast", "title": "Public Health Epidemiology Conversations — Preparing For The Worst Day", "url": "https://podcasts.apple.com/us/podcast/public-health-epidemiology-conversations/id1279064696", "description": "An epidemiologist-hosted podcast episode covering real emergency-preparedness epidemiology work in a state health department." }
      ]
```

- [ ] **Step 2: Validate JSON after all 10 insertions**

Run: `python -c "import json; d=json.load(open(r'data/roadmap-data.json', encoding='utf-8')); print([len(f.get('media', [])) for f in d['fields']])"`
Expected: `[2, 2, 2, 2, 2, 2, 2, 2, 2, 2]` — every field has exactly 2 media items, no exception.

- [ ] **Step 3: Add the media block to `renderField()` in `app.js`**

In the existing `renderField()` function, right after the `pathwaySteps` block is computed (after `.join("");` that follows the `pathwaySteps` map, currently ending around `app.js:131`) and before `const companyChips = ...`, add:

```js
  const media = field.media || [];
  const mediaItems = media
    .map((m) => {
      const label = m.type === "youtube" ? "YouTube" : "Podcast";
      return `
        <div class="item-row">
          <div class="item-text">
            <div class="item-title"><a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.title)}</a> <span class="item-sub">(${label})</span></div>
            <div class="item-sub">${esc(m.description)}</div>
          </div>
        </div>`;
    })
    .join("");
  const mediaSection = media.length
    ? `<h2>Hear/see what this is really like</h2><div class="media-list">${mediaItems}</div>`
    : "";
```

Then, in the function's `return` template (currently `app.js:203-225`), insert `${mediaSection}` right after the `<div class="pathway">${pathwaySteps}</div>` line and before `<h2>Companies known for hiring in this field</h2>`.

- [ ] **Step 4: Add `.media-list` spacing in `styles.css`**

Add after the `.item-row .item-text p` rule from Task 3:

```css
.media-list { margin-top: 0.5rem; }
```

- [ ] **Step 5: Manually verify in-browser**

Reload `http://localhost:8000/#/field/aerospace-engineering` (and spot-check 2-3 other fields).
Expected: "Hear/see what this is really like" section appears after the pathway stepper, listing the YouTube video and podcast with working links (each opens in a new tab); the `(YouTube)`/`(Podcast)` label is correct per item.

- [ ] **Step 6: Update `data/README.md`**

Append this section:

```markdown

## Adding a podcast or YouTube link to a field

Each field can have a `"media"` list, right after its `"organizations"` list:

```
"media": [
  { "type": "youtube", "title": "Video title as it appears on YouTube", "url": "https://youtube.com/watch?v=...", "description": "One sentence on what it shows." }
]
```

`"type"` must be exactly `"youtube"` or `"podcast"`. Always open the URL yourself first
to confirm it's a real, working link that actually matches the description before
saving — a broken or misleading link is worse than no link.
```

- [ ] **Step 7: Commit**

```bash
git add data/roadmap-data.json app.js styles.css data/README.md
git commit -m "Add verified day-in-the-life podcast/YouTube links to each field"
```

---

## Task 6: Job finder filter logic + tests

**Files:**
- Create: `jobs/jobs-filter.js`
- Create: `jobs/jobs-filter.test.js`

**Interfaces:**
- Produces: `filterJobs(jobs, filters)` — pure function, `filters: { fieldId?, keyword?, experienceLevel?, location? }`, returns a filtered array. Available as `window.filterJobs` in the browser and via `require("./jobs-filter.js")` in Node (dual-environment UMD-lite pattern — no bundler needed, matches the project's zero-build-step constraint).
- Consumed by: Task 7's `jobs-app.js`.

- [ ] **Step 1: Write the failing test file**

Create `jobs/jobs-filter.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { filterJobs } = require("./jobs-filter.js");

const SAMPLE = [
  { id: "a", title: "Software Engineer I", company: "Acme", fieldId: "computer-science-software-engineering", experienceLevel: "new-grad", location: "Remote", remote: true, description: "Build web apps." },
  { id: "b", title: "Structural EIT", company: "BuildCo", fieldId: "civil-engineering", experienceLevel: "internship", location: "Denver, CO", remote: false, description: "Support bridge design." },
  { id: "c", title: "Process Engineer", company: "ChemCo", fieldId: "chemical-engineering", experienceLevel: "1-3-years", location: "Houston, TX", remote: false, description: "Optimize plant yield." },
];

test("filterJobs with no filters returns all jobs", () => {
  assert.equal(filterJobs(SAMPLE, {}).length, 3);
});

test("filterJobs filters by fieldId", () => {
  const result = filterJobs(SAMPLE, { fieldId: "civil-engineering" });
  assert.deepEqual(result.map((j) => j.id), ["b"]);
});

test("filterJobs filters by experienceLevel", () => {
  const result = filterJobs(SAMPLE, { experienceLevel: "internship" });
  assert.deepEqual(result.map((j) => j.id), ["b"]);
});

test("filterJobs filters by keyword across title/company/description", () => {
  const result = filterJobs(SAMPLE, { keyword: "bridge" });
  assert.deepEqual(result.map((j) => j.id), ["b"]);
});

test("filterJobs filters by remote location", () => {
  const result = filterJobs(SAMPLE, { location: "remote" });
  assert.deepEqual(result.map((j) => j.id), ["a"]);
});

test("filterJobs filters by partial location text", () => {
  const result = filterJobs(SAMPLE, { location: "Houston" });
  assert.deepEqual(result.map((j) => j.id), ["c"]);
});

test("filterJobs combines multiple filters", () => {
  const result = filterJobs(SAMPLE, { fieldId: "chemical-engineering", experienceLevel: "1-3-years" });
  assert.deepEqual(result.map((j) => j.id), ["c"]);
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `node --test jobs/jobs-filter.test.js`
Expected: FAIL — `Cannot find module './jobs-filter.js'` (the module doesn't exist yet).

- [ ] **Step 3: Write `jobs/jobs-filter.js`**

```js
(function (global) {
  function filterJobs(jobs, filters) {
    const { fieldId, keyword, experienceLevel, location } = filters || {};
    return jobs.filter((job) => {
      if (fieldId && job.fieldId !== fieldId) return false;
      if (experienceLevel && job.experienceLevel !== experienceLevel) return false;
      if (keyword) {
        const k = keyword.trim().toLowerCase();
        if (k) {
          const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          if (!haystack.includes(k)) return false;
        }
      }
      if (location) {
        if (location.toLowerCase() === "remote") {
          if (!job.remote) return false;
        } else {
          const l = location.toLowerCase();
          if (!job.location.toLowerCase().includes(l)) return false;
        }
      }
      return true;
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { filterJobs };
  } else {
    global.filterJobs = filterJobs;
  }
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `node --test jobs/jobs-filter.test.js`
Expected: PASS — 7 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add jobs/jobs-filter.js jobs/jobs-filter.test.js
git commit -m "Add pure job-filtering logic with Node test-runner tests"
```

---

## Task 7: Job finder UI + cross-linking

**Files:**
- Create: `jobs/jobs-data.js`
- Create: `jobs/jobs.css`
- Create: `jobs/index.html`
- Create: `jobs/jobs-app.js`
- Modify: `index.html:12-18` (add "Find a Job" nav link)

**Interfaces:**
- Consumes: `filterJobs()` (Task 6), `ROADMAP_DATA.fields` (fetched live from `../data/roadmap-data.json` to populate the field filter dropdown, keeping one source of truth for field names).
- Produces: a working `/jobs/` page, reachable directly and from the roadmap's nav + Resources page.

- [ ] **Step 1: Create `jobs/jobs-data.js`**

```js
// Sample job listings for demo purposes only — every entry below is fictional
// (company names are suffixed "(sample)") and marked isSampleData: true.
//
// To wire up real listings later: replace SAMPLE_JOBS with data fetched from a
// real source. USAJOBS.gov's public API (https://developer.usajobs.gov/) is a
// reasonable free option — no paid tier, free API key via email registration,
// and it lists real early-career federal STEM roles.

const SAMPLE_JOBS = [
  { id: "job-1", title: "Aerospace Engineer I – Structures", company: "Skyline Aerospace (sample)", fieldId: "aerospace-engineering", experienceLevel: "new-grad", location: "Seattle, WA", remote: false, description: "Support structural analysis and CAD modeling for a satellite bus program under senior engineer guidance.", isSampleData: true },
  { id: "job-2", title: "Aerospace Systems Intern", company: "Skyline Aerospace (sample)", fieldId: "aerospace-engineering", experienceLevel: "internship", location: "Remote", remote: true, description: "Support systems engineering documentation and trade studies for a small satellite program.", isSampleData: true },
  { id: "job-3", title: "Mechanical Design Intern", company: "Northgate Manufacturing (sample)", fieldId: "mechanical-engineering", experienceLevel: "internship", location: "Austin, TX", remote: false, description: "Assist with SolidWorks modeling and prototype testing for a consumer robotics product line.", isSampleData: true },
  { id: "job-4", title: "Structural EIT", company: "BuildRight Civil Group (sample)", fieldId: "civil-engineering", experienceLevel: "new-grad", location: "Denver, CO", remote: false, description: "Perform calculations and drafting for bridge and roadway projects while studying for the FE exam.", isSampleData: true },
  { id: "job-5", title: "Electrical Design Engineer", company: "Voltaic Power Systems (sample)", fieldId: "electrical-engineering", experienceLevel: "1-3-years", location: "Austin, TX", remote: false, description: "Design and validate power distribution circuits for EV charging hardware.", isSampleData: true },
  { id: "job-6", title: "Software Engineer I", company: "Brightloop Technologies (sample)", fieldId: "computer-science-software-engineering", experienceLevel: "new-grad", location: "Remote", remote: true, description: "Build and test features for a cloud-based analytics dashboard used by enterprise customers.", isSampleData: true },
  { id: "job-7", title: "Backend Engineer, Platform", company: "Brightloop Technologies (sample)", fieldId: "computer-science-software-engineering", experienceLevel: "1-3-years", location: "San Francisco, CA", remote: true, description: "Own service reliability and API design for the company's core data platform.", isSampleData: true },
  { id: "job-8", title: "Process Engineer I", company: "Meridian Chemical Co. (sample)", fieldId: "chemical-engineering", experienceLevel: "new-grad", location: "Houston, TX", remote: false, description: "Monitor plant process data and support HAZOP reviews at a specialty chemicals facility.", isSampleData: true },
  { id: "job-9", title: "Data Scientist I", company: "Northlake Analytics (sample)", fieldId: "data-science-statistics", experienceLevel: "new-grad", location: "Remote", remote: true, description: "Build dashboards and basic forecasting models for a retail demand-planning team.", isSampleData: true },
  { id: "job-10", title: "R&D Engineer I, Medical Devices", company: "Vantage MedTech (sample)", fieldId: "biomedical-engineering", experienceLevel: "new-grad", location: "Minneapolis, MN", remote: false, description: "Support prototyping and design-verification testing for a cardiac monitoring device.", isSampleData: true },
  { id: "job-11", title: "Research Associate I", company: "Helix Bio Labs (sample)", fieldId: "biotechnology-pharmaceutical-sciences", experienceLevel: "new-grad", location: "Cambridge, MA", remote: false, description: "Run established cell-culture and assay protocols under direct supervision in a therapeutics lab.", isSampleData: true },
  { id: "job-12", title: "Epidemiologist I", company: "Riverside County Public Health (sample)", fieldId: "public-health-epidemiology", experienceLevel: "new-grad", location: "Sacramento, CA", remote: false, description: "Support case investigations and routine disease surveillance reporting for the county health department.", isSampleData: true }
];
```

- [ ] **Step 2: Create `jobs/jobs.css`**

```css
main#jobs-app {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 60vh;
}

.sample-banner {
  background: #fff7e6;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  color: var(--text);
  font-size: 0.9rem;
}

.jobs-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}
.filter-field { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-field label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
.filter-field input, .filter-field select {
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.jobs-count { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem; }

.jobs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.job-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
}
.job-card h3 { margin: 0 0 0.25rem; font-size: 1.05rem; }
.job-card p { color: var(--text-muted); font-size: 0.92rem; margin: 0.6rem 0 0; }
```

- [ ] **Step 3: Create `jobs/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Job Finder — Stem With Ashley</title>
  <link rel="icon" type="image/jpeg" href="../assets/logo.jpeg" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="stylesheet" href="jobs.css" />
</head>
<body>
  <header class="site-header">
    <a class="brand" href="../index.html">
      <img class="brand-logo" src="../assets/logo.jpeg" alt="Stem With Ashley logo" width="40" height="40" />
      <span>Stem&nbsp;With&nbsp;Ashley — Job&nbsp;Finder</span>
    </a>
    <nav class="site-nav">
      <a href="../index.html">&larr; Back to Roadmap</a>
    </nav>
  </header>

  <main id="jobs-app" aria-live="polite">
    <h1>Find a STEM job</h1>
    <p class="sample-banner">These are sample listings for demo purposes. See the comment at the top of <code>jobs-data.js</code> for how to connect a real job feed.</p>

    <form id="jobs-filters" class="jobs-filters">
      <div class="filter-field">
        <label for="filter-keyword">Keyword</label>
        <input type="text" id="filter-keyword" name="keyword" placeholder="e.g. robotics, clinical, backend" />
      </div>
      <div class="filter-field">
        <label for="filter-field-select">STEM field</label>
        <select id="filter-field-select" name="fieldId">
          <option value="">All fields</option>
        </select>
      </div>
      <div class="filter-field">
        <label for="filter-level">Experience level</label>
        <select id="filter-level" name="experienceLevel">
          <option value="">Any level</option>
          <option value="internship">Internship</option>
          <option value="new-grad">New grad</option>
          <option value="1-3-years">1-3 years</option>
        </select>
      </div>
      <div class="filter-field">
        <label for="filter-location">Location</label>
        <input type="text" id="filter-location" name="location" placeholder="City, state, or 'remote'" />
      </div>
    </form>

    <p id="jobs-count" class="jobs-count"></p>
    <div id="jobs-list" class="jobs-list"></div>
  </main>

  <footer class="site-footer">
    <p>Sample job data for demonstration. Not real, currently open listings.</p>
  </footer>

  <script src="jobs-data.js"></script>
  <script src="jobs-filter.js"></script>
  <script src="jobs-app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `jobs/jobs-app.js`**

```js
const JOBS_ROADMAP_DATA_URL = "../data/roadmap-data.json";

let FIELD_NAMES = {}; // fieldId -> name, loaded from the roadmap data file

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function currentFilters() {
  const form = document.getElementById("jobs-filters");
  return {
    keyword: form.keyword.value,
    fieldId: form.fieldId.value,
    experienceLevel: form.experienceLevel.value,
    location: form.location.value,
  };
}

function jobCard(job) {
  const fieldName = FIELD_NAMES[job.fieldId] || job.fieldId;
  const locationLabel = job.remote ? `${job.location} (Remote)` : job.location;
  return `
    <div class="job-card">
      <h3>${esc(job.title)}</h3>
      <div class="item-sub">${esc(job.company)} &middot; ${esc(fieldName)}</div>
      <div class="chip-list">
        <span class="chip">${esc(locationLabel)}</span>
        <span class="chip">${esc(job.experienceLevel)}</span>
      </div>
      <p>${esc(job.description)}</p>
    </div>`;
}

function render() {
  const filters = currentFilters();
  const results = filterJobs(SAMPLE_JOBS, filters);
  const countEl = document.getElementById("jobs-count");
  const listEl = document.getElementById("jobs-list");

  countEl.textContent = `${results.length} sample listing${results.length === 1 ? "" : "s"}`;

  listEl.innerHTML = results.length
    ? results.map(jobCard).join("")
    : `<p class="empty-state">No sample listings match those filters. Try clearing a filter.</p>`;
}

function populateFieldOptions(fields) {
  const select = document.getElementById("filter-field-select");
  fields.forEach((f) => {
    FIELD_NAMES[f.id] = f.name;
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    select.appendChild(opt);
  });
}

async function init() {
  try {
    const res = await fetch(JOBS_ROADMAP_DATA_URL);
    const data = await res.json();
    populateFieldOptions(data.fields);
  } catch (e) {
    console.error("Could not load field list for filters:", e);
  }

  document.getElementById("jobs-filters").addEventListener("input", render);
  render();
}

document.addEventListener("DOMContentLoaded", init);
```

Note: `form.fieldId` in `currentFilters()` refers to the `<select name="fieldId">` element by its `name` attribute (the `id` on that element, `filter-field-select`, is only for the `<label for>` association — form elements are addressed by `name` via `form.elements`/named access).

- [ ] **Step 5: Add the "Find a Job" link to the roadmap's nav in `index.html`**

Extend the nav (from Task 3) to:

```html
    <nav class="site-nav">
      <a href="#/" data-route="/">Fields</a>
      <a href="#/majors" data-route="/majors">Majors</a>
      <a href="#/skills" data-route="/skills">Skills</a>
      <a href="#/resources" data-route="/resources">Resources</a>
      <a href="#/shortlist" data-route="/shortlist">My Shortlist <span id="shortlist-count" class="badge"></span></a>
      <a href="jobs/">Find a Job</a>
    </nav>
```

- [ ] **Step 6: Manually verify in-browser**

With `python -m http.server 8000` still running from `stem-with-ashley/`, open `http://localhost:8000/jobs/` directly, and separately click "Find a Job" from the roadmap nav and from the Resources page.
Expected: field dropdown populates with all 10 real field names; typing a keyword, picking a field/level, or typing "remote"/a city into location live-filters the 12 sample cards and updates the count; the sample-data banner is visible; "← Back to Roadmap" returns to `index.html`; both the nav link and Resources page link now work (no more 404).

- [ ] **Step 7: Commit**

```bash
git add jobs/jobs-data.js jobs/jobs.css jobs/index.html jobs/jobs-app.js index.html
git commit -m "Add standalone Job Finder sub-app and cross-link from roadmap"
```

---

## Task 8: Responsiveness & accessibility QA pass

**Files:**
- Modify: `styles.css` and/or `jobs/jobs.css` (fixes only, as issues are found)
- Modify: `index.html`, `app.js`, `jobs/index.html` (fixes only, as issues are found)

**Interfaces:** None — this task fixes whatever the checks below surface, following the existing CSS custom-property/class patterns already used elsewhere in the file.

- [ ] **Step 1: Check the header nav at narrow widths**

With the local server running, resize the browser to 375px wide and check `index.html`. The nav now has 6 items (Fields, Majors, Skills, Resources, My Shortlist, Find a Job) plus the logo+brand — more than round 1's 3.
Expected: nav wraps cleanly via the existing `flex-wrap: wrap` on `.site-nav` (styles.css:47), no horizontal scrollbar on `body`, no overlapping text.
If items crowd together or wrap awkwardly: reduce `.site-nav`'s `gap` at narrow widths by adding
```css
@media (max-width: 480px) {
  .site-nav { gap: 0.75rem; font-size: 0.92rem; }
}
```
to `styles.css`.

- [ ] **Step 2: Check every new/changed page at 3 widths**

For each of: `#/majors`, `#/major/<any-id>`, `#/resources`, `#/field/<any-id>` (media section), and `jobs/index.html` — check at ~1280px, ~768px, and ~375px.
Expected at every width: no element overflows the viewport horizontally (`body` should never need horizontal scroll), card grids reflow to fewer columns on narrow widths (already handled by the existing `repeat(auto-fill, minmax(...))` / `repeat(auto-fit, minmax(...))` patterns), the job finder's filter grid stacks to a single column on mobile, tap targets (nav links, filter inputs, job cards) are comfortably sized (not visually cramped below ~40px tall).
Fix any overflow by finding the offending element's fixed width/padding and following the existing responsive patterns already in `styles.css` (e.g. `minmax()` grid tracks, `flex-wrap: wrap`) rather than introducing new layout techniques.

- [ ] **Step 3: Accessibility pass**

Check each new page for: every `<img>` has meaningful `alt` text (the logo does: `alt="Stem With Ashley logo"`); every form control in the job finder has an associated `<label for>` (already true in Task 7's markup — verify by clicking each label and confirming focus moves to its input); every interactive element is a real `<a>`, `<button>`, `<input>`, or `<select>` (true throughout this plan — no `<div onclick>` patterns were introduced); link text is descriptive (e.g. "The Aerospace Engineering Podcast", not "click here" — true in Task 5's markup); tab through each new page with the keyboard only and confirm a visible focus outline appears on every interactive element (browser default outline is fine — confirm nothing in this plan's CSS sets `outline: none` anywhere, since none of the tasks above touch `:focus` styles).

- [ ] **Step 4: Commit any fixes made**

If Steps 1-3 required changes:
```bash
git add -A
git commit -m "Responsiveness and accessibility fixes across new pages"
```
If no changes were needed, skip the commit (nothing to record).

---

## Task 9: Docs update + final verification pass

**Files:**
- Modify: `README.md` (root)

**Interfaces:** None.

- [ ] **Step 1: Update the root `README.md`**

Read the current root `README.md`, then add a short section (matching its existing tone/structure) documenting: the new `#/majors`, `#/major/<id>`, and `#/resources` routes; that `/jobs/` is a separate self-contained sub-app within the same repo/deploy, reachable directly at `/jobs/` or via the "Find a Job" nav link and the Resources page; and a one-line pointer to `data/README.md` as still being the single place Ashley edits all content, now including majors, resources, and per-field media links.

- [ ] **Step 2: Full link-check pass**

Run each of these to confirm they resolve (200 or a valid redirect, not a 404/error page) — reuses the same verification standard applied when the links were first added:
```bash
python -c "
import urllib.request
urls = [
  'https://www.mynextmove.org/explore/ip',
  'https://www.youtube.com/watch?v=IaEv63ut6fU',
  'https://www.youtube.com/watch?v=EXI3uQCxP38',
  'https://www.youtube.com/watch?v=G-j39crM4mc',
  'https://www.youtube.com/watch?v=KLBzEnVMPDE',
  'https://www.youtube.com/watch?v=J7mCQC4e3eA',
  'https://www.youtube.com/watch?v=4EbPykh_bmo',
  'https://www.youtube.com/watch?v=CSdpk6NzvhY',
  'https://www.youtube.com/watch?v=oMtn1XXyDyA',
  'https://www.youtube.com/watch?v=X3v37y2KZSo',
  'https://www.youtube.com/watch?v=tYx-fO5hMA4',
]
for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        code = urllib.request.urlopen(req, timeout=10).getcode()
        print(code, u)
    except Exception as e:
        print('ERROR', u, e)
"
```
Expected: every URL prints a `200` (or the script's exception is investigated and the link fixed/replaced before moving on — do not ship a link that errors here). The Apple Podcasts links were verified during research via direct page fetch rather than this script (Apple Podcasts often blocks bare `urllib` requests) — spot-check those 5 manually by opening them in a browser instead.

- [ ] **Step 3: Full manual walkthrough**

With the local server running, walk through the complete list from the spec's Testing/Verification Plan section: Majors grid → major detail → link into Field page; Resources page → quiz link opens; Field page → both media links open and match their labels; header logo renders and scales at 3 widths (already checked in Task 4/8, reconfirm); Job Finder reachable directly and via both roadmap entry points (already checked in Task 7/8, reconfirm); existing Fields/Skills/Shortlist/bookmarking/print-PDF still work unchanged (round 1 regression check).

- [ ] **Step 4: Final JSON validation**

Run: `python -c "import json; json.load(open(r'data/roadmap-data.json', encoding='utf-8')); print('valid')"`
Expected: `valid`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Update README for round-2 routes and Job Finder sub-app"
```

- [ ] **Step 6: Write the completion report**

Summarize for the user: what changed and which files, the O\*NET quiz choice and why, how the job finder works and its sample-data/future-integration note, where future podcast/YouTube/resource/major content should be added (pointing to `data/README.md`), confirmation the real logo is integrated (not a placeholder), and the results of the JSON validation, link check, `node --test` run, and manual walkthrough — explicitly noting that this project has no lint/typecheck/build tooling by design (zero-build static site), so those steps were replaced with the JSON/link/test/manual checks above.
