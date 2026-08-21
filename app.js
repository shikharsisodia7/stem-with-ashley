// Stem with Ashley Career Resources — app logic.
// Reads all content from data/roadmap-data.json. No build step, no framework.
// esc/safeGetJSON/safeSetJSON come from utils.js (loaded first in index.html).

const DATA_URL = "data/roadmap-data.json";
const BOOKMARK_KEY = "stemRoadmapBookmarks";

let ROADMAP_DATA = null;
let registry = {}; // id -> bookmark item, rebuilt on every render

// ---------- Bookmarks (localStorage) ----------

function getBookmarks() {
  const list = safeGetJSON(BOOKMARK_KEY, []);
  return Array.isArray(list) ? list : [];
}

function saveBookmarks(list) {
  safeSetJSON(BOOKMARK_KEY, list);
}

function isBookmarked(id) {
  return getBookmarks().some((b) => b.id === id);
}

function toggleBookmark(item) {
  const list = getBookmarks();
  const idx = list.findIndex((b) => b.id === item.id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(item);
  saveBookmarks(list);
}

function registerItem(item) {
  registry[item.id] = item;
  return item;
}

function starButton(item) {
  registerItem(item);
  const filled = isBookmarked(item.id);
  return `<button class="star-btn${filled ? " active" : ""}" data-id="${esc(item.id)}" aria-pressed="${filled}" title="${filled ? "Remove from shortlist" : "Add to shortlist"}">${filled ? "★" : "☆"}</button>`;
}

function wireStars(container) {
  container.querySelectorAll(".star-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = registry[btn.dataset.id];
      if (!item) return;
      toggleBookmark(item);
      render();
    });
  });
}

// ---------- Views ----------

function renderHome() {
  const cards = ROADMAP_DATA.fields
    .map((f) => {
      const star = starButton({
        id: `field:${f.id}`,
        type: "Field",
        fieldName: f.name,
        label: f.name,
        detail: f.summary,
      });
      return `
        <div class="field-card">
          <a class="field-card-link" href="#/field/${esc(f.id)}">
            <h3>${esc(f.name)}</h3>
            <p>${esc(f.summary)}</p>
          </a>
          ${star}
        </div>`;
    })
    .join("");

  return `
    <h1>Explore a STEM field</h1>
    <p>Pick a field to see a realistic five-year path from entry-level to senior roles.</p>
    <div class="field-grid">${cards}</div>`;
}

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

function renderField(fieldId) {
  const field = ROADMAP_DATA.fields.find((f) => f.id === fieldId);
  if (!field) {
    return `<p><a class="back-link" href="#/">&larr; Back to all fields</a></p><p>Field not found.</p>`;
  }

  const fieldStar = starButton({
    id: `field:${field.id}`,
    type: "Field",
    fieldName: field.name,
    label: field.name,
    detail: field.summary,
  });

  const pathwaySteps = field.pathway
    .map((step) => {
      const star = starButton({
        id: `pathway:${field.id}:${step.level}`,
        type: "Pathway Step",
        fieldName: field.name,
        label: step.title,
        detail: `Years ${step.yearRange} — ${step.description}`,
      });
      return `
        <details class="pathway-step">
          <summary>
            <span class="step-heading">
              <span class="step-level">${step.level}</span>
              <span>${esc(step.title)}</span>
              <span class="step-years">(Years ${esc(step.yearRange)})</span>
            </span>
            ${star}
          </summary>
          <p class="step-desc">${esc(step.description)}</p>
        </details>`;
    })
    .join("");

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

  const companyChips = field.companies
    .map((c) => `<span class="chip">${esc(c)}</span>`)
    .join("");

  const certRows = field.certifications
    .map((c) => {
      const star = starButton({
        id: `cert:${field.id}:${esc(c.name)}`,
        type: "Certification",
        fieldName: field.name,
        label: c.name,
        detail: `Issued by ${c.provider}`,
      });
      const nameHtml = c.url
        ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a>`
        : esc(c.name);
      return `
        <div class="item-row">
          <div class="item-text">
            <div class="item-title">${nameHtml}</div>
            <div class="item-sub">${esc(c.provider)}</div>
          </div>
          ${star}
        </div>`;
    })
    .join("");

  const mastersRows = field.mastersPrograms
    .map((m) => {
      const star = starButton({
        id: `masters:${field.id}:${esc(m.name)}`,
        type: "Master's Program",
        fieldName: field.name,
        label: m.name,
        detail: `Offered at ${m.schools.join(", ")}`,
      });
      return `
        <div class="item-row">
          <div class="item-text">
            <div class="item-title">${esc(m.name)}</div>
            <div class="item-sub">${esc(m.schools.join(", "))}</div>
          </div>
          ${star}
        </div>`;
    })
    .join("");

  const confRows = field.conferences
    .map((c) => {
      const star = starButton({
        id: `conf:${field.id}:${esc(c)}`,
        type: "Conference",
        fieldName: field.name,
        label: c,
        detail: "",
      });
      return `<div class="item-row"><div class="item-text item-title">${esc(c)}</div>${star}</div>`;
    })
    .join("");

  const orgRows = field.organizations
    .map((o) => {
      const star = starButton({
        id: `org:${field.id}:${esc(o)}`,
        type: "Organization",
        fieldName: field.name,
        label: o,
        detail: "",
      });
      return `<div class="item-row"><div class="item-text item-title">${esc(o)}</div>${star}</div>`;
    })
    .join("");

  return `
    <a class="back-link" href="#/">&larr; Back to all fields</a>
    <h1>${esc(field.name)} ${fieldStar}</h1>
    <p>${esc(field.summary)}</p>

    <h2>Five-year pathway</h2>
    <div class="pathway">${pathwaySteps}</div>
    ${mediaSection}

    <h2>Companies known for hiring in this field</h2>
    <div class="chip-list">${companyChips}</div>

    <h2>Certifications</h2>
    ${certRows}

    <h2>Master's degree programs</h2>
    ${mastersRows}

    <h2>Conferences</h2>
    ${confRows}

    <h2>Professional organizations</h2>
    ${orgRows}
  `;
}

function renderSkills() {
  const blocks = ROADMAP_DATA.skills
    .map((s) => {
      const star = starButton({
        id: `skill:${esc(s.name)}`,
        type: "Skill",
        fieldName: "Developmental Skills",
        label: s.name,
        detail: s.resources.join(", "),
      });
      const resources = s.resources.map((r) => `<li>${esc(r)}</li>`).join("");
      return `
        <details class="skill-block">
          <summary><span>${esc(s.name)}</span>${star}</summary>
          <ul>${resources}</ul>
        </details>`;
    })
    .join("");

  return `
    <h1>Developmental skills</h1>
    <p>These skills matter across every STEM field. Expand any skill for a few well-known resources.</p>
    ${blocks}`;
}

function renderShortlist() {
  const bookmarks = getBookmarks();

  const actions = `
    <div class="shortlist-actions">
      <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    </div>`;

  if (bookmarks.length === 0) {
    return `
      <h1>My Shortlist</h1>
      ${actions}
      <p class="empty-state">You haven't bookmarked anything yet. Browse a field or the skills page and click the star icon on anything you want to bring into a career-coach conversation.</p>`;
  }

  const groups = {};
  bookmarks.forEach((b) => {
    const key = b.fieldName || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });

  const groupHtml = Object.keys(groups)
    .sort()
    .map((fieldName) => {
      const rows = groups[fieldName]
        .map((b) => {
          const star = starButton(b);
          return `
            <div class="item-row">
              <div class="item-text">
                <div class="item-title">${esc(b.label)} <span class="item-sub">(${esc(b.type)})</span></div>
                ${b.detail ? `<div class="item-sub">${esc(b.detail)}</div>` : ""}
              </div>
              ${star}
            </div>`;
        })
        .join("");
      return `<section class="shortlist-group"><h2>${esc(fieldName)}</h2>${rows}</section>`;
    })
    .join("");

  return `<h1>My Shortlist</h1>${actions}${groupHtml}`;
}

// ---------- Router ----------

function updateNavActive(hash) {
  document.querySelectorAll(".site-nav a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === hash);
  });
  document.getElementById("shortlist-count").textContent =
    getBookmarks().length > 0 ? String(getBookmarks().length) : "";
}

function render() {
  if (!ROADMAP_DATA) return;
  registry = {};
  const app = document.getElementById("app");
  const hash = location.hash.slice(1) || "/";

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
    const id = decodeURIComponent(hash.slice("/field/".length));
    app.innerHTML = renderField(id);
    updateNavActive("");
  } else if (hash === "/skills") {
    app.innerHTML = renderSkills();
    updateNavActive("/skills");
  } else if (hash === "/resources") {
    app.innerHTML = renderResources();
    updateNavActive("/resources");
  } else if (hash === "/shortlist") {
    app.innerHTML = renderShortlist();
    updateNavActive("/shortlist");
  } else if (hash.startsWith("/interview")) {
    const step = hash === "/interview" ? 1 : parseInt(hash.slice("/interview/".length), 10) || 1;
    app.innerHTML = renderInterview(step);
    updateNavActive("/interview");
    wireInterview(app, step);
  } else if (hash === "/worksheet") {
    app.innerHTML = renderWorksheet();
    updateNavActive("/worksheet");
    wireWorksheet(app);
  } else {
    app.innerHTML = `<p>Page not found. <a href="#/">Go home</a>.</p>`;
    updateNavActive("");
  }

  wireStars(app);
  window.scrollTo(0, 0);
}

async function init() {
  try {
    const res = await fetch(DATA_URL);
    ROADMAP_DATA = await res.json();
    render();
  } catch (e) {
    document.getElementById("app").innerHTML =
      "<p>Sorry, the career data failed to load. Check that data/roadmap-data.json exists and is valid JSON.</p>";
    console.error(e);
  }
}

window.addEventListener("hashchange", render);
document.addEventListener("DOMContentLoaded", init);
