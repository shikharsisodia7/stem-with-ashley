const JOBS_ROADMAP_DATA_URL = "../data/roadmap-data.json";

let FIELD_NAMES = {}; // fieldId -> name, loaded from the roadmap data file
let JOBS = SAMPLE_JOBS; // replaced with draft listings inside the admin preview

const EXPERIENCE_LABELS = {
  "internship": "Internship",
  "new-grad": "New grad",
  "1-3-years": "1-3 years",
};

function currentFilters() {
  const form = document.getElementById("jobs-filters");
  return {
    keyword: form.keyword.value,
    fieldId: form.fieldId.value,
    experienceLevel: form.experienceLevel.value,
    location: form.location.value,
  };
}

function isSample(job) {
  return job.isSampleData !== false;
}

function jobCard(job) {
  const fieldName = FIELD_NAMES[job.fieldId] || job.fieldId;
  const locationLabel = job.remote && job.location.toLowerCase() !== "remote"
    ? `${job.location} (Remote)` : job.location;
  const source = job.sourceUrl && safeHttpUrl(job.sourceUrl) !== "#" ? safeHttpUrl(job.sourceUrl) : "";
  return `
    <div class="job-card">
      <h3>${esc(job.title)}</h3>
      <div class="item-sub">${esc(job.company)} &middot; ${esc(fieldName)}</div>
      <div class="chip-list">
        ${isSample(job) ? '<span class="chip chip-sample">Sample listing</span>' : '<span class="chip chip-real">Real listing</span>'}
        <span class="chip">${esc(locationLabel)}</span>
        <span class="chip">${esc(EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel)}</span>
      </div>
      <p>${esc(job.description)}</p>
      ${!isSample(job) && source ? `<p class="job-source"><a href="${esc(source)}" target="_blank" rel="noopener noreferrer">View the original posting ↗</a>${job.lastVerified ? ` <span class="item-sub">(last checked ${esc(job.lastVerified)})</span>` : ""}</p>` : ""}
    </div>`;
}

function renderBanner() {
  const banner = document.getElementById("jobs-banner");
  if (!banner) return;
  const samples = JOBS.filter(isSample).length;
  banner.textContent = samples === JOBS.length
    ? "These are sample listings for demonstration — they are not real, currently open jobs."
    : samples
      ? "Listings marked “Sample” are illustrative examples, not real openings. Real listings link to the original posting — always confirm details on the employer's site before applying."
      : "Each listing links to the original posting — always confirm details on the employer's site before applying.";
}

function render() {
  const filters = currentFilters();
  const results = filterJobs(JOBS, filters);
  const countEl = document.getElementById("jobs-count");
  const listEl = document.getElementById("jobs-list");

  countEl.textContent = `${results.length} listing${results.length === 1 ? "" : "s"}`;

  listEl.innerHTML = results.length
    ? results.map(jobCard).join("")
    : `<p class="empty-state">No listings match those filters. Try clearing a filter.</p>`;
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
    const preview = await receivePreviewData();
    let data;
    if (preview && preview.roadmap) {
      data = preview.roadmap;
      if (Array.isArray(preview.jobs)) JOBS = preview.jobs;
    } else {
      const res = await fetch(JOBS_ROADMAP_DATA_URL);
      data = await res.json();
    }
    populateFieldOptions(data.fields);
  } catch (e) {
    console.error("Could not load field list for filters:", e);
  }

  document.getElementById("jobs-filters").addEventListener("input", render);
  renderBanner();
  render();
}

document.addEventListener("DOMContentLoaded", init);
