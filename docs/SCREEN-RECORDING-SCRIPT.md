# Screen Recording Script — "Using and Updating Your Website"

The handoff video is **recorded automatically from real browser interactions** by
`tests/e2e/record-walkthrough.js`. The on-screen captions *are* the narration
below. There is no voice track. Length is about 8½ minutes, 1280×720, MP4.

- Parts 1–2 are recorded on the **live public website**.
- Parts 3–5 are recorded on a **local practice copy** of the dashboard: same code,
  real Supabase sign-in with a test account, but publishing goes to an in-memory
  fake repository, so no demo content reaches the real site. The video says so on
  screen.

To re-record (for example after design changes):

```
cd tests/e2e
node record-walkthrough.js "C:\path\to\output"     # writes walkthrough.webm
ffmpeg -i walkthrough.webm -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart walkthrough.mp4
```

(Needs the Docker Playwright relay and the e2e accounts in `.env.local`.)

If you'd rather record a narrated version yourself (Windows: **Win + G** → Capture,
or **Win + Shift + R** with Snipping Tool, or Loom/Zoom), follow the same
click-by-click sequence and read the captions aloud. Don't show any password,
setup link, or the Supabase/Vercel/GitHub dashboards.

## Part 1 — Introduction (0:00–0:30) · live site

| Screen / action | Caption (narration) |
| --- | --- |
| Title card | "STEM with Ashley — How to use and update your website" |
| Home page | "This is your live website: stem-with-ashley.vercel.app. Anyone can use it, with no sign-in." |
| | "It has eight apps: the Career Roadmap, Majors, Skills, Interview Prep, a Worksheet Generator, Resources, a Job Finder, and My Shortlist." |
| | "First we'll tour each app. Then we'll update content using your private admin dashboard." |

## Part 2 — Using the apps (0:30–4:10) · live site

| Screen / action | Caption |
| --- | --- |
| Home, scroll; click **Biomedical Engineering** | "The home page lists 12 STEM career fields. Click any field to see its five-year roadmap." |
| Pathway | "Each field shows four career stages — from entry level (years 0–1) to senior leadership (5+)." |
| Scroll to media | "Students can watch or listen to real professionals here, in the YouTube and podcast picks." |
| Scroll to companies/certifications; click a ☆ | "Below that: companies that hire, and certifications…" / "Click a ☆ star to save anything to My Shortlist…" |
| Majors → **Biomedical Engineering** | "College Majors helps students who are still choosing what to study." / "Each major shows typical courses…" |
| Skills → expand first skill | "Developmental Skills covers the non-technical skills…" |
| Interview Prep → Step 3 → Step 4 (type a STAR situation) → Step 6 (search "team") → Step 8 | Interview guide, STAR method, worksheet autosave, question bank, video practice stays on the device, later steps |
| Worksheet Generator: title "Photosynthesis", paste notes, **Generate**, **Show answer key** | "The Worksheet Generator turns class notes into a printable practice worksheet." … |
| Resources | "Resources lists trusted career-exploration websites…" |
| Job Finder: filter Computer Science; keyword "intern" | "…Every listing is labeled. A Sample listing is just an example; real listings link to the original job posting." |
| My Shortlist | "My Shortlist collects everything a student starred…" / "…saved only in that student's own browser." |

## Part 3 — The admin dashboard (4:10–6:00) · practice copy

| Screen / action | Caption |
| --- | --- |
| `/admin/` sign-in | "Your admin dashboard is at stem-with-ashley.vercel.app/admin." / "(For this video we're using a practice copy…)" / "Sign in with your email and password. The first time, you'll use the one-time setup link Shikhar sends you." |
| Type email + password (masked), **Sign in** | |
| Overview | "This is the Overview: website status, quick actions, and counts of all your content." |
| **Career Fields**, search "bio", open Biomedical Engineering | "Here are all 12 career fields. Use the search box to find one quickly." |
| Add a sentence to the summary | "Everything about the field is in normal boxes…" / "…marks the page as having unsaved changes." |
| **Save draft** | "Save draft keeps the change safely, even if you sign out. The public website does not change yet." |
| **Preview on website** → **Close preview** | "Preview on website shows the real site with your changes. Only you can see it." |
| **Review & Publish** → **Publish to live website** → **Publish now** | "Review & Publish lists every change…" / "The progress box tracks it: saved, rebuilding, then Live…" |
| ✓ Live; open the field page | "✓ Live. The change is now on the website." |

## Part 4 — Other admin features (6:00–8:00) · practice copy

| Screen / action | Caption |
| --- | --- |
| College Majors → Mechanical Engineering → tick **Aerospace Engineering** → Save draft | "Majors work the same way. Open one, edit its text, and tick the career fields it leads to." |
| Career Fields → Civil Engineering → **+ Add certification** (ENV SP, Institute for Sustainable Infrastructure, https://sustainableinfrastructure.org/) → Save draft | "To add a certification…" / "Web addresses must start with https://…" |
| Career Resources → **+ Add resource** (CareerOneStop) → Save draft | "Career Resources: add a website students should know about…" |
| Job Finder → **+ Add job listing** (sample) → Save draft | "Job Finder: add, edit, or remove listings. Keep 'sample' ticked unless it's a real, open job." / "For a real job, untick Sample and paste the link…" |
| Review & Publish → **Discard all unpublished changes** | "All of those drafts are listed here together…" / "Or, if you change your mind…" |
| Version History → expand a version → **Restore this version** → confirm → ✓ Live; Activity log | "Version History lists every published version…" / "Made a mistake?…" / "…Nothing is ever lost…" / "The Activity log…" |

## Part 5 — Summary (8:00–8:40)

| Screen / action | Caption |
| --- | --- |
| Help page | "To recap: Sign in → choose what to change → edit → Save draft → Preview → Publish → check the website." |
| Guide page (`/admin/guide.html`) | "Help / Instructions (top right) opens the full step-by-step guide with pictures, any time." |
| Overview → **Sign out** | "Layout or design changes, new kinds of pages…: contact Shikhar." / "Click Sign out when you're done…" |
| End card | "You're all set! Website: stem-with-ashley.vercel.app · Dashboard: stem-with-ashley.vercel.app/admin" |
