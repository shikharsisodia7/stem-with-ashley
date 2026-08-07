# Stem With Ashley — Five-Year STEM Career Roadmap

A self-contained web app for recent college graduates entering STEM careers. Pick a
field, see a realistic five-year path from entry-level to senior roles, browse
certifications/schools/conferences/organizations, explore developmental skills, and
bookmark anything of interest into a printable shortlist for a career-coach
conversation.

Live site: deployed on Vercel as project `stem-with-ashley`.

## What this is built with

Plain HTML, CSS, and JavaScript. No framework, no build step, no npm install, no
backend, no database, no paid services. That's intentional — it means there's nothing
to break from a bad build, and no dependency that can go stale or need updating.

- `index.html` / `styles.css` / `app.js` — the app itself.
- `data/roadmap-data.json` — **all the content** (career pathways, companies, certs,
  schools, conferences, organizations, skills). This is the only file you need to
  touch to update what the app shows. See **`data/README.md`** for a full editing
  guide written for a non-technical editor.

## Editing the content (start here if you're Ashley)

Open `data/README.md`. It walks through exactly how to edit an existing field, add a
brand new field, or add a new skill — no coding required, just careful text editing
inside a structured file.

## How to see your changes live

This site is connected to GitHub, and GitHub is connected to Vercel. That means:

1. Edit `data/roadmap-data.json` (or any file) and save it.
2. Commit and push the change to GitHub.
3. Vercel automatically detects the push and redeploys the live site — usually within
   a minute or two. Nothing else to click.

### If you're comfortable with GitHub Desktop or the GitHub website

- **GitHub Desktop**: open the app, select this repository, you'll see your edited
  file listed as a change. Write a short summary (e.g. "Update aerospace companies
  list"), click "Commit to main", then click "Push origin".
- **GitHub website**: navigate to the file in the repository, click the pencil (edit)
  icon, make your change in the browser, scroll down and click "Commit changes"
  directly. This pushes automatically — no separate push step.

## Running it on your own computer (optional, for previewing before you push)

Because the app loads `data/roadmap-data.json` with a fetch request, opening
`index.html` directly by double-clicking it won't work (browsers block that for local
files). Instead, run a tiny local server from this folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser. Stop the server with Ctrl+C when
you're done.

## Project structure

```
stem-with-ashley/
  index.html              # page shell
  styles.css               # all styling
  app.js                    # routing, rendering, bookmarking logic
  data/
    roadmap-data.json       # ALL content — edit this to update the app
    README.md                # editing guide for non-technical editors
  docs/
    superpowers/specs/       # original design spec for this project
```

## Notes on scope

This is a working prototype, not a finished product — built to be functional and
useful now, and iterated on over time. Bookmarks are stored in each visitor's browser
only (no accounts, no server-side storage), so they don't persist across devices or
survive clearing browser data.
