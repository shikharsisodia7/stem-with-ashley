# Screen Recording Guide — "How Ashley Edits Content"

**Status: this environment cannot record narrated desktop video** (no camera/mic/screen-video
capture available to the assistant in this session), so no recording was faked. This guide
tells Shikhar exactly what to record manually, in order, so the real video can be captured
quickly with any normal screen recorder (Windows' built-in Xbox Game Bar `Win+G`, Zoom's
local recording, Loom, OBS, etc.).

**Target length: 4-6 minutes.** This is a content-editing walkthrough for Ashley, not a
programming tutorial — keep it to the exact steps below and resist the urge to explain how
the JavaScript works.

## Before you hit record

- Have the repo open in a code editor (VS Code is fine) at `stem-with-ashley/`.
- Have a terminal ready in the same folder.
- Have a browser tab ready, but don't start the local server until step 5 below.
- Close anything unrelated (other tabs, other apps, notifications) — this is what Ashley
  will actually see, so keep it clean.
- Decide your one example edit ahead of time so you don't improvise on camera. Suggested:
  add a second resource to the Resources page (low-risk, visually obvious, doesn't touch
  the 10 existing fields). A concrete example script is in **Step 3** below.

## Recording outline

### 1. Open the repository (30-45 sec)

- Show the GitHub repo in the browser for a few seconds:
  `github.com/shikharsisodia7/stem-with-ashley` — this is the single source of truth.
  Vercel deploys automatically from here every time changes are pushed.
- Switch to the code editor with the repo open locally. Say plainly: "Everything Ashley
  needs to edit lives in one folder called `data/`."

### 2. Locate and explain `data/roadmap-data.json` (60-90 sec)

- Open `data/roadmap-data.json`.
- Scroll through at a normal pace and point out, in plain language (no code jargon):
  - `"fields"` — the 10 career fields, each with its pathway, companies, certifications, and
    now a `"media"` list (the YouTube/podcast links).
  - `"majors"` — the majors students browse before picking a field.
  - `"resources"` — the list shown on the Resources page (currently just the career quiz).
- Open `data/README.md` side-by-side for a moment and say: "This file is the actual
  instructions — it explains exactly how to copy a block and edit it, in plain English,
  for every content type in this file."

### 3. Make one real example edit (90-120 sec)

Add a second entry to `"resources"`, right after the existing O\*NET entry. Type it live
on camera (don't paste) so Ashley can see the process, not just the result:

```json
{
  "title": "Example Resource — delete or replace me",
  "url": "https://www.example.com",
  "provider": "Example Provider",
  "description": "This is a placeholder added during the walkthrough recording — safe to delete or replace with a real resource."
}
```

- Narrate as you type: "I'm copying the shape of the existing entry, giving it a new title,
  a real URL, who runs it, and one sentence on what it does."
- Save the file (`Ctrl+S`).

### 4. Show the JSON stays valid (20-30 sec)

- Point out the closing bracket/comma structure briefly — just enough to say "commas and
  brackets matter; if the site breaks after an edit, this is almost always why, and
  `data/README.md` explains how to check it on jsonlint.com."
- No need to demonstrate jsonlint on camera unless you want to.

### 5. Run the app locally and show the change (60-90 sec)

- In the terminal: `python -m http.server 8000` (or your usual local-server command).
- Open `http://localhost:8000/#/resources` in the browser.
- Point at the new "Example Resource" card and say: "That's it — that's the whole loop.
  Edit the file, save, refresh."
- Delete the example entry now (on camera or just mention you're cleaning it up after),
  so it never gets committed for real.

### 6. Explain repeatability (30 sec)

- Say plainly: "Adding a new field, a new major, a new podcast link, or another resource
  is the exact same process — copy an existing block in `roadmap-data.json`, edit the
  text between the quotes, save, and push to GitHub. Vercel handles the rest automatically."

### 7. Show where the logo lives (15-20 sec)

- Briefly open the `assets/` folder and point at `logo.jpeg`.
- Say: "This is the real logo file. If Ashley ever gets an updated version from the design
  team, it just replaces this file — same filename, same folder — and it updates
  everywhere the logo appears (header and browser tab icon)."

### 8. Show where Job Finder sample data lives (20-30 sec)

- Open `jobs/jobs-data.js`.
- Point at the comment at the top of the file and say: "These are sample job listings,
  clearly marked as fake. If a real job feed gets connected later, this is the file that
  changes — the comment at the top already notes USAJOBS.gov's free API as one realistic
  option. This is more of a developer task than a content edit, so it's here mainly so
  Ashley knows where it lives, not something she's expected to edit herself."

### 9. Close (10-15 sec)

- One sentence wrap-up: "That's the whole content-editing loop — one file, plain-text
  edits, and Vercel does the rest. Anything beyond that (new features, design changes) is
  a message to Shikhar."

## After recording

- Trim dead air from the start/end if your recorder doesn't do it automatically.
- Save/export as an `.mp4` if possible (most compatible format).
- Upload to wherever Ashley expects it (Google Drive, in the same folder as the logo file,
  is a reasonable default since that's already the established handoff channel).
- Optional but recommended: add the video link to the root `README.md` or `data/README.md`
  so it's discoverable later, not just sent once over chat.
