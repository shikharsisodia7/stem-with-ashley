const JOBS_ROADMAP_DATA_URL = "../data/roadmap-data.json";

let FIELD_NAMES = {}; // fieldId -> name, loaded from the roadmap data file

const EXPERIENCE_LABELS = {
  "internship": "Internship",
  "new-grad": "New grad",
  "1-3-years": "1-3 years",
};

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
  const locationLabel = job.remote && job.location.toLowerCase() !== "remote"
    ? `${job.location} (Remote)` : job.location;
  return `
    <div class="job-card">
      <h3>${esc(job.title)}</h3>
      <div class="item-sub">${esc(job.company)} &middot; ${esc(fieldName)}</div>
      <div class="chip-list">
        <span class="chip">${esc(locationLabel)}</span>
        <span class="chip">${esc(EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel)}</span>
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
