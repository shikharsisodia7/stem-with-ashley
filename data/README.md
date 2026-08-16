# Editing the career data (for Ashley)

Everything the app shows — career pathways, companies, certifications, schools,
conferences, organizations, and skills — lives in one file: **`roadmap-data.json`**,
right here in this `data` folder. You never need to touch any other file to update
content.

You can edit this file with any plain text editor (Notepad, VS Code, even GitHub's
own web editor). It's just structured text, but it follows strict rules — a misplaced
comma or bracket will stop the whole app from loading. Follow the patterns below
exactly and you'll be fine. When in doubt, copy an existing block and edit the text
inside it rather than typing a new block from scratch.

## Editing an existing field

Find the field by its `"name"` (e.g. `"name": "Aerospace Engineering"`). Everything
between that field's opening `{` and its matching closing `}` belongs to it. You can
freely edit any of the text values:

- `"summary"` — the one-line description shown on the homepage card.
- `"pathway"` — the 4 career steps. Each has a `title`, a `yearRange` (like `"3-5"`),
  and a `description`. Edit the text, but keep all four steps.
- `"companies"` — just a list of names in quotes, separated by commas.
- `"certifications"` — each has a `name` and a `provider` (who issues it).
- `"mastersPrograms"` — each has a `name` and a list of `schools` that offer it.
- `"conferences"` and `"organizations"` — lists of names in quotes.

**Rule of thumb:** only edit the text between quotation marks. Don't remove commas,
quotes, curly braces `{ }`, or square brackets `[ ]` — those are what hold the file
together.

## Adding a brand new field

1. Open `roadmap-data.json`.
2. Find the closing `}` of the *last* field currently in the `"fields"` list (right
   before `],` and `"skills"`).
3. Just above that field's closing `}`, add a comma after it, then paste in a full
   copy of any existing field block (everything from its opening `{` to its closing
   `}`).
4. Edit every value inside your pasted copy: give it a new `"id"` (lowercase, words
   separated by hyphens, must be unique — e.g. `"materials-science"`), a new `"name"`,
   and update every other field to match the new career area.
5. Save the file.

## Adding or editing a developmental skill

Find the `"skills"` list near the bottom of the file. Each skill is:

```
{ "name": "Public Speaking & Presenting", "resources": ["Toastmasters International", "..."] }
```

Add a new one the same way you'd add a field: copy an existing `{ ... }` skill block,
add a comma after the previous one, paste your copy in, and edit the `name` and
`resources` list. Resources are just names (books, organizations, courses) — no links
needed.

## After you save

1. Save `roadmap-data.json`.
2. Commit and push the change to GitHub (see the root `README.md` for exact steps).
3. Vercel automatically rebuilds and publishes the live site within a minute or two —
   nothing else to click or configure.

## If the site breaks after an edit

This almost always means the JSON structure got broken (a missing comma, an extra
comma, or a missing bracket). Paste the full contents of `roadmap-data.json` into
[jsonlint.com](https://jsonlint.com) and click "Validate JSON" — it will tell you
exactly which line has the problem.

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
