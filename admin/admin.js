// Content Helper — builds correctly formatted JSON blocks from form input.
// Read-only fetch of data/roadmap-data.json (to populate field-id dropdowns) is the
// only network-ish activity here; nothing is ever sent anywhere or written to disk.

let KNOWN_FIELDS = []; // [{id, name}]

function fieldOptionsHtml(selectedId) {
  return KNOWN_FIELDS.map(
    (f) => `<option value="${esc(f.id)}" ${f.id === selectedId ? "selected" : ""}>${esc(f.name)} (${esc(f.id)})</option>`
  ).join("");
}

function row(labelText, inputHtml) {
  return `<div class="form-field"><label>${esc(labelText)}<br>${inputHtml}</label></div>`;
}

function textInput(id, placeholder) {
  return `<input type="text" id="${id}" placeholder="${esc(placeholder || "")}" />`;
}

function textArea(id, placeholder, rows) {
  return `<textarea id="${id}" rows="${rows || 3}" placeholder="${esc(placeholder || "")}"></textarea>`;
}

// ---------- Form definitions per content type ----------

const FORMS = {
  field: () => `
    ${row("Field name (e.g. \"Materials Science and Engineering\")", textInput("f-name"))}
    ${row("Field ID (lowercase, hyphens only, must be unique — leave blank to auto-generate from the name)", textInput("f-id"))}
    ${row("One-sentence summary (shown on the homepage card)", textArea("f-summary", "", 2))}
    <h3>Five-year pathway (4 steps)</h3>
    ${[1, 2, 3, 4]
      .map(
        (n) => `
        <div class="pathway-input-group">
          <strong>Step ${n}</strong>
          ${row("Title", textInput(`f-path${n}-title`))}
          ${row("Year range (e.g. \"0-2\")", textInput(`f-path${n}-years`))}
          ${row("Description", textArea(`f-path${n}-desc`, "", 2))}
        </div>`
      )
      .join("")}
    ${row("Companies (comma-separated)", textArea("f-companies", "Company A, Company B, Company C", 2))}
    <h3>Certifications (up to 5, name / provider / URL)</h3>
    ${[1, 2, 3, 4, 5]
      .map(
        (n) => `
        <div class="pathway-input-group">
          ${row(`Certification ${n} name`, textInput(`f-cert${n}-name`))}
          ${row("Provider", textInput(`f-cert${n}-provider`))}
          ${row("URL (official provider page)", textInput(`f-cert${n}-url`, "https://..."))}
        </div>`
      )
      .join("")}
    <h3>Master's programs (up to 3)</h3>
    ${[1, 2, 3]
      .map(
        (n) => `
        <div class="pathway-input-group">
          ${row(`Program ${n} name`, textInput(`f-masters${n}-name`))}
          ${row("Schools (comma-separated)", textInput(`f-masters${n}-schools`))}
        </div>`
      )
      .join("")}
    ${row("Conferences (comma-separated)", textArea("f-conferences", "", 2))}
    ${row("Professional organizations (comma-separated)", textArea("f-organizations", "", 2))}
    <h3>Media (optional)</h3>
    ${row("YouTube title", textInput("f-yt-title"))}
    ${row("YouTube URL", textInput("f-yt-url"))}
    ${row("YouTube one-sentence description", textInput("f-yt-desc"))}
    ${row("Podcast title", textInput("f-pod-title"))}
    ${row("Podcast URL", textInput("f-pod-url"))}
    ${row("Podcast one-sentence description", textInput("f-pod-desc"))}
  `,

  major: () => `
    ${row("Major name", textInput("m-name"))}
    ${row("Major ID (leave blank to auto-generate)", textInput("m-id"))}
    ${row("One-sentence summary", textArea("m-summary", "", 2))}
    ${row("Typical courses (comma-separated)", textArea("m-courses", "", 2))}
    ${row("Why students choose it (1-2 sentences)", textArea("m-why", "", 2))}
    <div class="form-field">
      <label for="m-leads">Career field(s) this major leads to</label>
      <select id="m-leads" multiple size="6">${fieldOptionsHtml()}</select>
      <p class="muted-note">Hold Ctrl (Windows) or Cmd (Mac) to select more than one.</p>
    </div>
  `,

  certification: () => `
    <div class="form-field">
      <label for="c-field">Which field is this certification for?</label>
      <select id="c-field">${fieldOptionsHtml()}</select>
    </div>
    ${row("Certification name", textInput("c-name"))}
    ${row("Provider", textInput("c-provider"))}
    ${row("Official URL", textInput("c-url", "https://..."))}
  `,

  resource: () => `
    ${row("Resource title", textInput("r-title"))}
    ${row("URL", textInput("r-url", "https://..."))}
    ${row("Provider (who runs it)", textInput("r-provider"))}
    ${row("One-sentence description", textArea("r-description", "", 2))}
  `,

  skill: () => `
    ${row("Skill name", textInput("s-name"))}
    ${row("Resources (comma-separated — books, courses, organizations)", textArea("s-resources", "", 2))}
  `,

  job: () => `
    ${row("Job title", textInput("j-title"))}
    ${row("Company (add \"(sample)\" unless this is a real, currently-open listing)", textInput("j-company"))}
    <div class="form-field">
      <label for="j-field">STEM field</label>
      <select id="j-field">${fieldOptionsHtml()}</select>
    </div>
    <div class="form-field">
      <label for="j-level">Experience level</label>
      <select id="j-level">
        <option value="internship">Internship</option>
        <option value="new-grad">New grad</option>
        <option value="1-3-years">1-3 years</option>
      </select>
    </div>
    ${row("Location (city, state, or \"Remote\")", textInput("j-location"))}
    <div class="form-field">
      <label><input type="checkbox" id="j-remote" /> Remote position</label>
    </div>
    ${row("Description (1 sentence)", textArea("j-description", "", 2))}
  `,
};

const INSTRUCTIONS = {
  field:
    'Open data/roadmap-data.json. Find the closing "}" of the LAST field in the "fields" list (right before "],\" and \"skills\"). Add a comma after that "}", then paste this whole block in. Save the file, then commit and push (see the root README.md).',
  major:
    'Open data/roadmap-data.json. Find the closing "}" of the LAST major in the "majors" list (right before "],\" and \"resources\"). Add a comma after that "}", then paste this block in. Save, commit, and push.',
  certification:
    'Open data/roadmap-data.json and find the field you chose above. Inside its "certifications" list, add a comma after the LAST existing certification entry, then paste this block in right after it. Save, commit, and push.',
  resource:
    'Open data/roadmap-data.json. In the "resources" list at the very end of the file, add a comma after the last existing entry, then paste this block in. Save, commit, and push.',
  skill:
    'Open data/roadmap-data.json. In the "skills" list, add a comma after the last existing skill entry, then paste this block in. Save, commit, and push.',
  job:
    'Open jobs/jobs-data.js. Inside the SAMPLE_JOBS array, add a comma after the last existing job entry, then paste this block in. Give it a unique "id" (e.g. "job-21") before saving. Save, commit, and push.',
};

// ---------- Value gathering + JSON building ----------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function csvList(text) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildField() {
  const name = val("f-name");
  const id = val("f-id") || slugify(name);
  const pathway = [1, 2, 3, 4].map((n) => ({
    level: n,
    title: val(`f-path${n}-title`),
    yearRange: val(`f-path${n}-years`),
    description: val(`f-path${n}-desc`),
  }));
  const certifications = [1, 2, 3, 4, 5]
    .map((n) => ({ name: val(`f-cert${n}-name`), provider: val(`f-cert${n}-provider`), url: val(`f-cert${n}-url`) }))
    .filter((c) => c.name);
  const mastersPrograms = [1, 2, 3]
    .map((n) => ({ name: val(`f-masters${n}-name`), schools: csvList(val(`f-masters${n}-schools`)) }))
    .filter((m) => m.name);
  const media = [];
  if (val("f-yt-title")) media.push({ type: "youtube", title: val("f-yt-title"), url: val("f-yt-url"), description: val("f-yt-desc") });
  if (val("f-pod-title")) media.push({ type: "podcast", title: val("f-pod-title"), url: val("f-pod-url"), description: val("f-pod-desc") });

  const obj = {
    id, name, summary: val("f-summary"), pathway,
    companies: csvList(val("f-companies")),
    certifications, mastersPrograms,
    conferences: csvList(val("f-conferences")),
    organizations: csvList(val("f-organizations")),
  };
  if (media.length) obj.media = media;
  return obj;
}

function buildMajor() {
  const name = val("m-name");
  const leadsSelect = document.getElementById("m-leads");
  const leadsToFields = leadsSelect ? [...leadsSelect.selectedOptions].map((o) => o.value) : [];
  return {
    id: val("m-id") || slugify(name),
    name,
    summary: val("m-summary"),
    typicalCourses: csvList(val("m-courses")),
    whyChooseIt: val("m-why"),
    leadsToFields,
  };
}

function buildCertification() {
  return { name: val("c-name"), provider: val("c-provider"), url: val("c-url") };
}

function buildResource() {
  return { title: val("r-title"), url: val("r-url"), provider: val("r-provider"), description: val("r-description") };
}

function buildSkill() {
  return { name: val("s-name"), resources: csvList(val("s-resources")) };
}

function buildJob() {
  return {
    id: "job-XX",
    title: val("j-title"),
    company: val("j-company"),
    fieldId: val("j-field"),
    experienceLevel: val("j-level"),
    location: val("j-location"),
    remote: document.getElementById("j-remote").checked,
    description: val("j-description"),
    isSampleData: true,
  };
}

const BUILDERS = {
  field: buildField,
  major: buildMajor,
  certification: buildCertification,
  resource: buildResource,
  skill: buildSkill,
  job: buildJob,
};

// ---------- Wiring ----------

function renderCurrentForm() {
  const type = document.getElementById("content-type").value;
  document.getElementById("admin-form").innerHTML =
    FORMS[type]() + '<button type="button" class="btn" id="generate-btn">Generate content block</button>';
  document.getElementById("admin-output").textContent = "";
  document.getElementById("admin-instructions").textContent = "";
}

function generateOutput() {
  const type = document.getElementById("content-type").value;
  const obj = BUILDERS[type]();
  const json = JSON.stringify(obj, null, 2);
  document.getElementById("admin-output").textContent = json;
  document.getElementById("admin-instructions").textContent = INSTRUCTIONS[type];
}

async function copyOutput() {
  const text = document.getElementById("admin-output").textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById("copy-btn");
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (e) {
    console.error("Clipboard copy failed:", e);
  }
}

async function init() {
  try {
    const res = await fetch("../data/roadmap-data.json");
    const data = await res.json();
    KNOWN_FIELDS = data.fields.map((f) => ({ id: f.id, name: f.name }));
  } catch (e) {
    console.error("Could not load field list:", e);
  }

  document.getElementById("content-type").addEventListener("change", renderCurrentForm);
  document.getElementById("admin-app").addEventListener("click", (e) => {
    if (e.target && e.target.id === "copy-btn") copyOutput();
    if (e.target && e.target.id === "generate-btn") generateOutput();
  });
  document.getElementById("admin-form").addEventListener("submit", (e) => e.preventDefault());

  renderCurrentForm();
}

document.addEventListener("DOMContentLoaded", init);
