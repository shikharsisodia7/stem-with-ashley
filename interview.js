// Interview Prep — the full STEM Interview Guide: process, STAR method, an
// interactive STAR worksheet, "Tell Me About Yourself", a searchable behavioral /
// situational / technical question bank with typed practice, technical interview
// prep, browser-native video practice, self-review checklists, questions to ask
// the interviewer, and before/during/after checklists.
//
// Content (questions, checklists, STAR/TMAY copy, technical-prep material) lives
// in interview-data.js (InterviewData) so it can be edited without touching this
// file. Search/filter logic lives in interview-questions.js (InterviewQuestions).
// The video recorder lives in interview-recorder.js (InterviewRecorder). This file
// is the DOM rendering + wiring layer, in the same style as worksheet.js.
//
// esc/safeGetJSON/safeSetJSON come from utils.js. Nothing here ever sends typed
// answers, STAR/TMAY text, or video anywhere — everything is local to this browser.

const INTERVIEW_STATE_KEY = "stemInterviewState";
const TOTAL_INTERVIEW_STEPS = 14;
const VIDEO_STEP_NUMBER = 8;

const INTERVIEW_STEP_NAMES = [
  "Overview",
  "Interview Process",
  "STAR Method",
  "STAR Worksheet",
  "Tell Me About Yourself",
  "Question Bank",
  "Technical Prep",
  "Video Practice",
  "Self-Review",
  "Ask the Interviewer",
  "Before the Interview",
  "During the Interview",
  "After the Interview",
  "Ready Check",
];

const OVERVIEW_PATHWAY = [
  { label: "Understand the interview process", step: 2 },
  { label: "Learn the STAR method", step: 3 },
  { label: "Prepare your experiences in the STAR worksheet", step: 4 },
  { label: "Practice “Tell Me About Yourself”", step: 5 },
  { label: "Practice behavioral questions", step: 6 },
  { label: "Practice situational questions", step: 6 },
  { label: "Review technical fundamentals", step: 7 },
  { label: "Practice technical thinking in the question bank", step: 6 },
  { label: "Record yourself answering on camera", step: 8 },
  { label: "Review your performance with a self-review checklist", step: 9 },
  { label: "Prepare questions for the interviewer", step: 10 },
  { label: "Run through the before / during / after checklist", step: 11 },
];

// ---------- State ----------

function defaultInterviewState() {
  return {
    completedSteps: [],
    star: [],
    starDraft: { situation: "", task: "", action: "", result: "" },
    tmayDraft: "",
    answers: {},
    reviewChecklist: { behavioral: {}, technical: {} },
    checklistBefore: {},
    checklistDuring: {},
    checklistAfter: {},
    videoPracticeAttempted: false,
  };
}

function getInterviewState() {
  const state = safeGetJSON(INTERVIEW_STATE_KEY, null);
  const fallback = defaultInterviewState();
  if (!state || typeof state !== "object") return fallback;

  return {
    completedSteps: Array.isArray(state.completedSteps) ? state.completedSteps : fallback.completedSteps,
    star: Array.isArray(state.star) ? state.star : fallback.star,
    starDraft: state.starDraft && typeof state.starDraft === "object"
      ? { situation: "", task: "", action: "", result: "", ...state.starDraft }
      : fallback.starDraft,
    tmayDraft: typeof state.tmayDraft === "string" ? state.tmayDraft : fallback.tmayDraft,
    answers: state.answers && typeof state.answers === "object" ? state.answers : fallback.answers,
    reviewChecklist: state.reviewChecklist && typeof state.reviewChecklist === "object"
      ? {
          behavioral: state.reviewChecklist.behavioral && typeof state.reviewChecklist.behavioral === "object" ? state.reviewChecklist.behavioral : {},
          technical: state.reviewChecklist.technical && typeof state.reviewChecklist.technical === "object" ? state.reviewChecklist.technical : {},
        }
      : fallback.reviewChecklist,
    checklistBefore: state.checklistBefore && typeof state.checklistBefore === "object" ? state.checklistBefore : fallback.checklistBefore,
    checklistDuring: state.checklistDuring && typeof state.checklistDuring === "object" ? state.checklistDuring : fallback.checklistDuring,
    checklistAfter: state.checklistAfter && typeof state.checklistAfter === "object" ? state.checklistAfter : fallback.checklistAfter,
    videoPracticeAttempted: Boolean(state.videoPracticeAttempted),
  };
}

function saveInterviewState(state) {
  safeSetJSON(INTERVIEW_STATE_KEY, state);
}

function markStepComplete(step) {
  const state = getInterviewState();
  if (!state.completedSteps.includes(step)) {
    state.completedSteps.push(step);
    saveInterviewState(state);
  }
}

function getAnswerEntry(state, id) {
  return state.answers[id] || { text: "", practiced: false, favorite: false };
}

function flashSaved(el) {
  if (!el) return;
  el.textContent = "Saved";
  el.classList.add("visible");
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(() => el.classList.remove("visible"), 1400);
}

async function copyTextToClipboard(text, indicatorEl, emptyMessage) {
  if (!text || !text.trim()) {
    if (indicatorEl) {
      indicatorEl.textContent = emptyMessage || "Nothing to copy yet.";
      indicatorEl.classList.add("visible");
      clearTimeout(indicatorEl._fadeTimer);
      indicatorEl._fadeTimer = setTimeout(() => indicatorEl.classList.remove("visible"), 1800);
    }
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      if (indicatorEl) {
        indicatorEl.textContent = "Copied";
        indicatorEl.classList.add("visible");
        clearTimeout(indicatorEl._fadeTimer);
        indicatorEl._fadeTimer = setTimeout(() => indicatorEl.classList.remove("visible"), 1400);
      }
    } else {
      throw new Error("Clipboard API unavailable");
    }
  } catch (e) {
    if (indicatorEl) {
      indicatorEl.textContent = "Couldn't copy automatically — select and copy the text manually.";
      indicatorEl.classList.add("visible");
    }
  }
}

// ---------- Shell ----------

function interviewStepNav(currentStep) {
  const state = getInterviewState();
  const pills = INTERVIEW_STEP_NAMES.map((name, i) => {
    const step = i + 1;
    const done = state.completedSteps.includes(step);
    const current = step === currentStep;
    const classes = ["step-pill"];
    if (current) classes.push("current");
    if (done) classes.push("done");
    return `<a class="${classes.join(" ")}" href="#/interview/${step}" aria-current="${current ? "step" : "false"}">
      <span class="step-pill-num">${done ? "✓" : step}</span>
      <span class="step-pill-label">${esc(name)}</span>
    </a>`;
  }).join("");
  return `<nav class="interview-steps" aria-label="Interview prep steps">${pills}</nav>`;
}

function interviewStepFooter(currentStep) {
  const prev = currentStep > 1 ? `<a class="btn btn-secondary" href="#/interview/${currentStep - 1}">&larr; Back</a>` : "<span></span>";
  const isLast = currentStep >= TOTAL_INTERVIEW_STEPS;
  const next = isLast
    ? `<a class="btn" href="#/interview/1">Start over</a>`
    : `<button type="button" class="btn" data-interview-next="${currentStep}">Mark complete &amp; continue &rarr;</button>`;
  return `<div class="interview-footer">${prev}${next}</div>`;
}

function renderInterview(stepInput) {
  const step = Math.min(TOTAL_INTERVIEW_STEPS, Math.max(1, stepInput || 1));
  const body = INTERVIEW_STEP_RENDERERS[step] ? INTERVIEW_STEP_RENDERERS[step]() : "<p>Step not found.</p>";

  return `
    <a class="back-link" href="#/">&larr; Back to all fields</a>
    <h1>STEM Interview Prep Guide</h1>
    <p>A hands-on, step-by-step guide to your next STEM interview — understand the process, prepare your stories, practice out loud, and rehearse on camera. Nothing here is graded or submitted anywhere; it's saved only in this browser.</p>
    ${interviewStepNav(step)}
    <section class="interview-step" aria-labelledby="interview-step-heading">
      ${body}
    </section>
    ${interviewStepFooter(step)}
  `;
}

// ---------- Step 1: Overview ----------

function renderInterviewStep1() {
  const rows = OVERVIEW_PATHWAY.map(
    (item, i) => `
      <div class="item-row">
        <div class="item-text item-title">
          <a href="#/interview/${item.step}">${i + 1}. ${esc(item.label)}</a>
        </div>
      </div>`
  ).join("");

  return `
    <h2 id="interview-step-heading">Welcome</h2>
    <p>This guide walks you from "I don't know how to prepare for an interview" to "I understand the process, know how to answer behavioral questions, know how to prepare for technical interviews, and have practiced my answers out loud."</p>
    <p>It helps you:</p>
    <ul>
      <li>Understand interview formats and what to expect at each stage</li>
      <li>Prepare your stories using the STAR method</li>
      <li>Practice typed responses to real behavioral, situational, and technical questions</li>
      <li>Prepare for technical/coding interviews specifically</li>
      <li>Rehearse on camera, entirely on your own device</li>
      <li>Evaluate your own responses with a self-review checklist</li>
      <li>Prepare thoughtful questions for your interviewer</li>
    </ul>
    <h3>A suggested path</h3>
    <div class="pathway">${rows}</div>
    <p class="muted-note">You don't have to go in order — jump to whatever step is most useful right now using the step navigation above.</p>
  `;
}

// ---------- Step 2: The Interview Process ----------

function renderInterviewStep2() {
  const rows = InterviewData.STAGES.map(
    (s, i) => `
      <div class="item-row">
        <div class="item-text">
          <div class="item-title">${i + 1}. ${esc(s.name)}</div>
          <p>${esc(s.description)}</p>
        </div>
      </div>`
  ).join("");

  return `
    <h2 id="interview-step-heading">Step 2 — The Interview Process</h2>
    <p>An "industry interview" is a structured conversation where a company decides whether you and the role are a good match — and you decide the same thing about them. A full process can include some or all of these stages:</p>
    <div class="pathway">${rows}</div>
    <p class="muted-note">Interview processes vary substantially by company, team, industry, and role. Not every candidate will see every stage above, smaller companies often combine stages, and the order can vary.</p>
  `;
}

// ---------- Step 3: STAR Method (tutorial) ----------

function starLetterBlock(letter, title, bullets) {
  const items = bullets.map((b) => `<li>${esc(b)}</li>`).join("");
  return `
    <div class="star-letter-block">
      <div class="star-letter-badge">${letter}</div>
      <div>
        <h3>${esc(title)}</h3>
        <ul>${items}</ul>
      </div>
    </div>`;
}

function renderInterviewStep3() {
  const g = InterviewData.STAR_GUIDANCE;
  const whyItems = InterviewData.STAR_WHY_IT_WORKS.map((p) => `<li>${esc(p)}</li>`).join("");
  const mistakeItems = InterviewData.STAR_MISTAKES.map((m) => `<li>${esc(m)}</li>`).join("");
  const ex = InterviewData.STAR_EXAMPLE;

  return `
    <h2 id="interview-step-heading">Step 3 — The STAR Method</h2>
    <p>STAR is a simple structure for answering behavioral questions ("tell me about a time when...") so your answer has a clear beginning, middle, and end instead of rambling.</p>

    <div class="star-letters">
      ${starLetterBlock("S", "Situation", g.situation)}
      ${starLetterBlock("T", "Task", g.task)}
      ${starLetterBlock("A", "Action", g.action)}
      ${starLetterBlock("R", "Result", g.result)}
    </div>
    <p class="muted-note">Action usually deserves the most detail — it's the part of the story that's actually about you.</p>

    <h3>Why interviewers ask this way</h3>
    <ul>${whyItems}</ul>

    <h3>Common STAR Mistakes</h3>
    <ul class="guidance-list">${mistakeItems}</ul>

    <h3>Example — hypothetical STEM scenario</h3>
    <p class="muted-note">${esc(ex.label)}. This did not happen to a real, named person — it illustrates the structure.</p>
    <div class="star-example">
      <p><strong>Situation:</strong> ${esc(ex.situation)}</p>
      <p><strong>Task:</strong> ${esc(ex.task)}</p>
      <p><strong>Action:</strong> ${esc(ex.action)}</p>
      <p><strong>Result:</strong> ${esc(ex.result)}</p>
    </div>
    <p>Ready to build your own? Continue to the <a href="#/interview/4">STAR Worksheet</a>.</p>
  `;
}

// ---------- Step 4: STAR Worksheet (interactive) ----------

function starEntryRow(entry) {
  return `
    <div class="item-row star-saved-row" data-star-id="${esc(entry.id)}">
      <div class="item-text">
        <div class="item-title">Saved practice answer</div>
        <p>${esc(entry.combined)}</p>
      </div>
      <button type="button" class="btn btn-secondary btn-small" data-star-delete="${esc(entry.id)}">Delete</button>
    </div>`;
}

function renderInterviewStep4() {
  const state = getInterviewState();
  const d = state.starDraft;
  const savedRows = state.star.map(starEntryRow).join("");
  const savedSection = state.star.length
    ? `<h3>Your saved stories</h3><p class="muted-note">Save a few different stories here so you have options for different questions.</p>${savedRows}`
    : "";

  return `
    <h2 id="interview-step-heading">Step 4 — STAR Worksheet</h2>
    <p>Think of one real project, class, job, or club experience. Fill in each box — this autosaves as you type.</p>
    <form id="star-builder-form" class="star-builder">
      <div class="form-field">
        <label for="star-situation">Situation</label>
        <textarea id="star-situation" rows="2" placeholder="What context does the interviewer need to understand the example?">${esc(d.situation)}</textarea>
      </div>
      <div class="form-field">
        <label for="star-task">Task</label>
        <textarea id="star-task" rows="2" placeholder="What responsibility, objective, or challenge were you personally responsible for?">${esc(d.task)}</textarea>
      </div>
      <div class="form-field">
        <label for="star-action">Action</label>
        <textarea id="star-action" rows="3" placeholder="What specific steps did you take?">${esc(d.action)}</textarea>
        <span class="field-hint">This is usually the longest part — 2-3 sentences of specific steps, not one vague sentence.</span>
      </div>
      <div class="form-field">
        <label for="star-result">Result</label>
        <textarea id="star-result" rows="2" placeholder="What happened because of your actions? Include measurable impact when truthful and relevant.">${esc(d.result)}</textarea>
      </div>
      <div class="star-builder-actions">
        <button type="button" class="btn btn-secondary" id="star-copy-btn">Copy formatted STAR response</button>
        <button type="button" class="btn btn-secondary" id="star-clear-btn">Clear worksheet</button>
        <button type="button" class="btn" id="star-save-btn">Save as a new story</button>
        <span class="save-indicator" id="star-save-indicator" aria-live="polite"></span>
      </div>
    </form>
    <h3>Read-aloud preview</h3>
    <div id="star-combined-output" class="star-combined-output" aria-live="polite">${esc(InterviewStar.buildStarAnswer(d)) || "Fill in the boxes above to see your combined practice answer here."}</div>

    ${savedSection}
  `;
}

// ---------- Step 5: Tell Me About Yourself ----------

function tmayFrameworkCard(part) {
  const examples = part.examples.map((e) => `<li>${esc(e)}</li>`).join("");
  return `
    <div class="tmay-card">
      <h3>${esc(part.label)}</h3>
      <p class="tmay-prompt">${esc(part.prompt)}</p>
      <ul>${examples}</ul>
    </div>`;
}

function renderInterviewStep5() {
  const state = getInterviewState();
  const t = InterviewData.TMAY;
  const avoidItems = t.avoid.map((a) => `<li>${esc(a)}</li>`).join("");

  return `
    <h2 id="interview-step-heading">Step 5 — "Tell Me About Yourself"</h2>
    <p>Almost every interview opens with this. Use the Present &rarr; Past &rarr; Future framework instead of your whole resume.</p>
    <div class="tmay-framework">
      ${tmayFrameworkCard(t.present)}
      ${tmayFrameworkCard(t.past)}
      ${tmayFrameworkCard(t.future)}
    </div>
    <p class="muted-note">${esc(t.lengthGuidance)}</p>

    <h3>What to avoid</h3>
    <ul class="guidance-list">${avoidItems}</ul>

    <h3>Practice your answer</h3>
    <div class="form-field">
      <label for="tmay-practice">Your "Tell Me About Yourself" answer</label>
      <textarea id="tmay-practice" rows="6" placeholder="Present: who you are now. Past: 1-2 relevant experiences. Future: why this is a logical next step.">${esc(state.tmayDraft)}</textarea>
    </div>
    <div class="star-builder-actions">
      <button type="button" class="btn btn-secondary" id="tmay-copy-btn">Copy answer</button>
      <button type="button" class="btn btn-secondary" id="tmay-clear-btn">Clear</button>
      <span class="save-indicator" id="tmay-save-indicator" aria-live="polite"></span>
    </div>
  `;
}

// ---------- Step 6: Question Bank ----------

const QB_DIFFICULTIES = ["introductory", "intermediate", "advanced"];
const QB_CATEGORY_LABELS = { behavioral: "Behavioral", situational: "Situational", technical: "Technical" };

let qbFilters = { category: "behavioral", keyword: "", difficulty: "all", status: "all" };
let qbSelectedId = null;

function qbCurrentList() {
  const state = getInterviewState();
  return InterviewQuestions.filterQuestions(InterviewData.QUESTIONS, {
    category: qbFilters.category,
    keyword: qbFilters.keyword,
    difficulty: qbFilters.difficulty,
    status: qbFilters.status,
    progress: state.answers,
  });
}

function qbCard(q, state) {
  const entry = getAnswerEntry(state, q.id);
  const selected = q.id === qbSelectedId;
  const classes = ["qb-card"];
  if (selected) classes.push("selected");
  // Two sibling buttons (select + favorite), not one nested inside the other —
  // nesting a <button> inside another <button> is invalid HTML and browsers
  // handle it unpredictably. Same pattern as .field-card / .star-btn in app.js.
  return `
    <div class="${classes.join(" ")}">
      <button type="button" class="qb-card-select" data-qb-select="${esc(q.id)}" aria-current="${selected}">
        <span class="qb-card-top">
          <span class="qb-card-badges">
            <span class="chip qb-badge-difficulty qb-badge-${esc(q.difficulty)}">${esc(q.difficulty)}</span>
            <span class="chip qb-badge-sub">${esc(q.subcategory)}</span>
          </span>
          ${entry.practiced ? '<span class="qb-practiced-check" title="Practiced">✓</span>' : ""}
        </span>
        <span class="qb-card-question">${esc(q.question)}</span>
      </button>
      <button type="button" class="star-btn qb-fav-star${entry.favorite ? " active" : ""}" data-qb-favorite="${esc(q.id)}" aria-pressed="${entry.favorite}" aria-label="${entry.favorite ? "Remove from favorites" : "Add to favorites"}">${entry.favorite ? "★" : "☆"}</button>
    </div>`;
}

function renderQuestionBankBody() {
  const state = getInterviewState();
  const list = qbCurrentList();

  if (!list.find((q) => q.id === qbSelectedId)) {
    qbSelectedId = list.length ? list[0].id : null;
  }
  const selected = list.find((q) => q.id === qbSelectedId) || null;

  const counts = InterviewQuestions.countByCategory(InterviewData.QUESTIONS);
  const listHtml = list.length
    ? list.map((q) => qbCard(q, state)).join("")
    : `<p class="empty-state">No questions match your filters. Try clearing the search or filters.</p>`;

  return `
    <div class="qb-tabs" role="tablist" aria-label="Question category">
      ${Object.keys(QB_CATEGORY_LABELS)
        .map(
          (cat) => `<button type="button" class="qb-tab${qbFilters.category === cat ? " active" : ""}" data-qb-category="${cat}" role="tab" aria-selected="${qbFilters.category === cat}">${QB_CATEGORY_LABELS[cat]} <span class="qb-tab-count">${counts[cat] || 0}</span></button>`
        )
        .join("")}
    </div>

    <div class="qb-filters">
      <div class="form-field form-field-inline">
        <label for="qb-search">Search questions</label>
        <input type="text" id="qb-search" placeholder="Search by keyword, topic, or skill..." value="${esc(qbFilters.keyword)}" />
      </div>
      <div class="form-field form-field-inline">
        <label for="qb-difficulty">Difficulty</label>
        <select id="qb-difficulty">
          <option value="all" ${qbFilters.difficulty === "all" ? "selected" : ""}>All</option>
          ${QB_DIFFICULTIES.map((d) => `<option value="${d}" ${qbFilters.difficulty === d ? "selected" : ""}>${d[0].toUpperCase()}${d.slice(1)}</option>`).join("")}
        </select>
      </div>
      <div class="form-field form-field-inline">
        <label for="qb-status">Show</label>
        <select id="qb-status">
          <option value="all" ${qbFilters.status === "all" ? "selected" : ""}>All questions</option>
          <option value="practiced" ${qbFilters.status === "practiced" ? "selected" : ""}>Practiced</option>
          <option value="unpracticed" ${qbFilters.status === "unpracticed" ? "selected" : ""}>Not yet practiced</option>
          <option value="favorites" ${qbFilters.status === "favorites" ? "selected" : ""}>Favorites</option>
        </select>
      </div>
    </div>
    <p class="qb-count muted-note">${list.length} question${list.length === 1 ? "" : "s"}</p>

    <div class="qb-layout">
      <div class="qb-list" id="qb-list">${listHtml}</div>
      <div class="qb-detail" id="qb-detail">${selected ? renderQbDetail(selected, state) : `<p class="empty-state">Select a question from the list to practice it.</p>`}</div>
    </div>
  `;
}

function renderQbDetail(q, state) {
  const entry = getAnswerEntry(state, q.id);
  const evaluatesText = (q.evaluates || []).join(", ");
  const list = qbCurrentList();
  const idx = list.findIndex((item) => item.id === q.id);
  const isBehavioralOrSituational = q.category === "behavioral" || q.category === "situational";

  return `
    <div class="qb-detail-header">
      <span class="chip qb-badge-difficulty qb-badge-${esc(q.difficulty)}">${esc(q.difficulty)}</span>
      <span class="chip qb-badge-sub">${esc(q.subcategory)}</span>
      ${q.starRecommended ? '<span class="chip qb-badge-star">STAR recommended</span>' : ""}
    </div>
    <p class="question-text">"${esc(q.question)}"</p>
    <p class="muted-note">What the interviewer may be evaluating: ${esc(evaluatesText)}</p>

    ${
      isBehavioralOrSituational
        ? `<p class="muted-note">Try answering before reviewing the guidance below.</p>
      <details class="qb-tip-disclosure">
        <summary>Show interviewer guidance</summary>
        <p>${esc(q.tip)}</p>
      </details>`
        : `<div class="privacy-note qb-tip-inline">${esc(q.tip)}</div>`
    }

    <div class="form-field">
      <label for="qb-answer">Your practice answer</label>
      <textarea id="qb-answer" rows="6" data-question-id="${esc(q.id)}" placeholder="Type a practice answer...">${esc(entry.text)}</textarea>
    </div>
    <div class="star-builder-actions">
      <button type="button" class="btn" id="qb-practiced-btn" data-question-id="${esc(q.id)}">${entry.practiced ? "✓ Practiced" : "Mark practiced"}</button>
      <button type="button" class="btn btn-secondary" id="qb-copy-btn" data-question-id="${esc(q.id)}">Copy answer</button>
      <button type="button" class="btn btn-secondary" id="qb-clear-btn" data-question-id="${esc(q.id)}">Clear answer</button>
      <span class="save-indicator" id="qb-save-indicator" aria-live="polite"></span>
    </div>
    <div class="question-nav">
      <button type="button" class="btn btn-secondary" id="qb-prev-btn" ${idx <= 0 ? "disabled" : ""}>&larr; Previous</button>
      <span class="question-counter">Question ${idx + 1} of ${list.length}</span>
      <button type="button" class="btn btn-secondary" id="qb-next-btn" ${idx < 0 || idx >= list.length - 1 ? "disabled" : ""}>Next &rarr;</button>
    </div>
  `;
}

function renderInterviewStep6() {
  return `
    <h2 id="interview-step-heading">Step 6 — Question Bank</h2>
    <p>Behavioral, situational, and technical questions in one place. Search, filter, and practice a typed answer for each — your progress is saved automatically.</p>
    <div id="qb-body">${renderQuestionBankBody()}</div>
  `;
}

// ---------- Step 7: Technical Interview Prep ----------

function renderInterviewStep7() {
  const p = InterviewData.TECHNICAL_PREP;
  const roleNotes = p.roleNotes.map((r) => `<div class="item-row"><div class="item-text"><div class="item-title">${esc(r.role)}</div><p>${esc(r.note)}</p></div></div>`).join("");
  const fundamentals = p.fundamentals.map((f) => `<span class="chip">${esc(f)}</span>`).join("");
  const dataStructures = p.dataStructures
    .map(
      (ds) => `<div class="item-row"><div class="item-text"><div class="item-title">${esc(ds.name)}</div><p>${esc(ds.whatItIs)} <strong>Good for:</strong> ${esc(ds.goodFor)} <strong>Operations:</strong> ${esc(ds.operations)}</p></div></div>`
    )
    .join("");
  const algorithms = p.algorithms.map((a) => `<div class="item-row"><div class="item-text"><div class="item-title">${esc(a.name)}</div><p>${esc(a.note)}</p></div></div>`).join("");
  const complexity = p.complexity
    .map((c) => `<div class="item-row"><div class="item-text"><div class="item-title">${esc(c.notation)} — ${esc(c.meaning)}</div><p>Example: ${esc(c.example)}</p></div></div>`)
    .join("");
  const workflow = p.workflow.map((w) => `<li>${esc(w)}</li>`).join("");
  const edgeCases = p.edgeCases.map((e) => `<span class="chip">${esc(e)}</span>`).join("");

  return `
    <h2 id="interview-step-heading">Step 7 — Technical / Coding Interview Prep</h2>
    <p>Technical expectations vary a lot by role. Here's what's typically emphasized:</p>
    <div class="pathway">${roleNotes}</div>

    <h3>Programming Fundamentals</h3>
    <div class="chip-list">${fundamentals}</div>

    <h3>Data Structures</h3>
    <p class="muted-note">For each: what it is, what it's good for, and what operations to expect being asked about.</p>
    <div class="pathway">${dataStructures}</div>

    <h3>Algorithms</h3>
    <div class="pathway">${algorithms}</div>

    <h3>Complexity (Big O)</h3>
    <p>Interviewers ask about both time and space complexity because they want to know your solution won't fall over on realistic input sizes.</p>
    <div class="pathway">${complexity}</div>

    <h3>Coding Interview Workflow</h3>
    <p class="muted-note"><strong>Communication is part of the interview.</strong> Don't silently code for 20 minutes — narrate your thinking.</p>
    <ol class="guidance-list">${workflow}</ol>

    <h3>Common Edge Cases to Consider</h3>
    <div class="chip-list">${edgeCases}</div>

    <p>Ready to practice? Head to the <a href="#/interview/6">Technical section of the Question Bank</a>.</p>
  `;
}

// ---------- Step 8: Video Practice ----------

function renderVideoPanelBody(state, errorCode) {
  const timer = InterviewRecorder.formatElapsed(0);
  const errorHtml = errorCode ? `<p class="video-error" role="alert">${esc(InterviewRecorder.messageForError(errorCode))}</p>` : "";
  const showVideo = state === "recording" || state === "preview";
  const videoTag = `<video id="video-preview" class="video-preview-el" playsinline></video>`;

  let controls = "";
  if (state === "idle" || state === "requesting") {
    controls = `<button type="button" class="btn" id="video-start-btn" ${state === "requesting" ? "disabled" : ""}>${state === "requesting" ? "Requesting camera access…" : "Practice on Camera"}</button>`;
  } else if (state === "recording") {
    controls = `
      <div class="video-recording-indicator" role="status"><span class="rec-dot" aria-hidden="true"></span> Recording — <span id="video-timer">${timer}</span></div>
      <button type="button" class="btn btn-secondary" id="video-stop-btn">Stop Recording</button>`;
  } else if (state === "preview") {
    controls = `
      <div class="video-practice-actions">
        <button type="button" class="btn" id="video-record-again-btn">Record Again</button>
        <button type="button" class="btn btn-secondary" id="video-discard-btn">Discard Recording</button>
        <a class="btn btn-secondary" id="video-download-link" href="#" download="stem-with-ashley-practice-answer.webm">Download recording</a>
      </div>`;
  }

  return `
    ${errorHtml}
    <div class="video-preview-wrap${showVideo ? "" : " video-preview-empty"}">
      ${showVideo ? videoTag : `<div class="video-preview-placeholder">${state === "requesting" ? "Waiting for camera access…" : "Your camera preview will appear here once you start."}</div>`}
    </div>
    <div class="video-controls">${controls}</div>
  `;
}

function renderInterviewStep8() {
  if (typeof InterviewRecorder === "undefined" || !InterviewRecorder.isRecordingSupported()) {
    return `
      <h2 id="interview-step-heading">Step 8 — Video Practice</h2>
      <p>Rehearse saying an answer out loud, on camera, entirely on your own device.</p>
      <p class="privacy-note">Video practice isn't available in this browser (it needs camera/microphone support and a secure connection). Every other part of this guide still works without it — try a recent version of Chrome, Edge, or Firefox.</p>
    `;
  }

  return `
    <h2 id="interview-step-heading">Step 8 — Video Practice</h2>
    <p>Pick a question from the <a href="#/interview/6">Question Bank</a>, then rehearse saying your answer out loud on camera.</p>
    <p class="privacy-note">🔒 Your practice recording stays on your device during this session and is not uploaded to STEM With Ashley or anyone else. It's removed from memory when you discard it, record again, or leave this page.</p>
    <div class="video-practice-panel" id="video-practice-panel" aria-live="polite">
      ${renderVideoPanelBody("idle", null)}
    </div>
  `;
}

let activeRecorderController = null;

function cleanupActiveRecorder() {
  if (activeRecorderController) {
    activeRecorderController.cleanup();
    activeRecorderController = null;
  }
}

function wireVideoStep(container) {
  if (typeof InterviewRecorder === "undefined" || !InterviewRecorder.isRecordingSupported()) return;
  cleanupActiveRecorder();

  const panel = container.querySelector("#video-practice-panel");
  if (!panel) return;
  let lastError = null;

  function syncVideoElement() {
    const videoEl = panel.querySelector("#video-preview");
    if (!videoEl || !activeRecorderController) return;
    const { state, recordedUrl } = activeRecorderController.getState();
    if (state === "recording") {
      const stream = activeRecorderController.getStream();
      if (stream && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      }
    } else if (state === "preview" && recordedUrl) {
      videoEl.srcObject = null;
      videoEl.muted = false;
      videoEl.controls = true;
      if (videoEl.getAttribute("src") !== recordedUrl) videoEl.src = recordedUrl;
      const downloadLink = panel.querySelector("#video-download-link");
      if (downloadLink) downloadLink.href = recordedUrl;
    }
  }

  function attachControlHandlers() {
    const startBtn = panel.querySelector("#video-start-btn");
    if (startBtn) startBtn.addEventListener("click", () => { lastError = null; activeRecorderController.start(); });
    const stopBtn = panel.querySelector("#video-stop-btn");
    if (stopBtn) stopBtn.addEventListener("click", () => activeRecorderController.stop());
    const recordAgainBtn = panel.querySelector("#video-record-again-btn");
    if (recordAgainBtn) recordAgainBtn.addEventListener("click", () => { activeRecorderController.discard(); activeRecorderController.start(); });
    const discardBtn = panel.querySelector("#video-discard-btn");
    if (discardBtn) discardBtn.addEventListener("click", () => activeRecorderController.discard());
  }

  activeRecorderController = InterviewRecorder.createVideoPracticeController({
    onStateChange: (state) => {
      if (state !== "idle") lastError = null;
      panel.innerHTML = renderVideoPanelBody(state, state === "idle" ? lastError : null);
      attachControlHandlers();
      syncVideoElement();
      if (state === "preview") {
        const st = getInterviewState();
        if (!st.videoPracticeAttempted) {
          st.videoPracticeAttempted = true;
          saveInterviewState(st);
        }
      }
    },
    onTick: (seconds) => {
      const timerEl = panel.querySelector("#video-timer");
      if (timerEl) timerEl.textContent = InterviewRecorder.formatElapsed(seconds);
    },
    onError: (code) => {
      lastError = code;
      panel.innerHTML = renderVideoPanelBody("idle", code);
      attachControlHandlers();
      syncVideoElement();
    },
  });

  attachControlHandlers();
  syncVideoElement();

  const onHashChange = () => {
    if (!location.hash.startsWith(`#/interview/${VIDEO_STEP_NUMBER}`)) {
      cleanupActiveRecorder();
      window.removeEventListener("hashchange", onHashChange);
    }
  };
  window.addEventListener("hashchange", onHashChange);
}

// ---------- Step 9: Self-Review ----------

function renderInterviewStep9() {
  const state = getInterviewState();
  const behavioralChecked = InterviewData.SELF_REVIEW.behavioral.filter((_, i) => state.reviewChecklist.behavioral[i]).length;
  const technicalChecked = InterviewData.SELF_REVIEW.technical.filter((_, i) => state.reviewChecklist.technical[i]).length;

  return `
    <h2 id="interview-step-heading">Step 9 — Self-Review</h2>
    <p>After you answer a question (typed or on camera), check your own answer against these lists.</p>

    <h3>Behavioral / Situational Review <span class="checklist-progress">${behavioralChecked} / ${InterviewData.SELF_REVIEW.behavioral.length}</span></h3>
    <div class="checklist" data-checklist="review-behavioral">
      ${renderChecklist(InterviewData.SELF_REVIEW.behavioral, state.reviewChecklist.behavioral, "data-review-behavioral-item")}
    </div>

    <h3>Technical Review <span class="checklist-progress">${technicalChecked} / ${InterviewData.SELF_REVIEW.technical.length}</span></h3>
    <div class="checklist" data-checklist="review-technical">
      ${renderChecklist(InterviewData.SELF_REVIEW.technical, state.reviewChecklist.technical, "data-review-technical-item")}
    </div>
  `;
}

// ---------- Step 10: Questions to Ask the Interviewer ----------

function renderInterviewStep10() {
  const groupsHtml = InterviewData.INTERVIEWER_QUESTIONS.groups
    .map((g) => {
      const items = g.questions.map((q) => `<li>${esc(q)}</li>`).join("");
      return `<h3>${esc(g.label)}</h3><ul class="guidance-list">${items}</ul>`;
    })
    .join("");

  return `
    <h2 id="interview-step-heading">Step 10 — Questions to Ask the Interviewer</h2>
    <p class="muted-note">${esc(InterviewData.INTERVIEWER_QUESTIONS.guidance)}</p>
    ${groupsHtml}
  `;
}

// ---------- Steps 11-13: Before / During / After checklists ----------

function renderChecklist(items, checkedMap, dataAttr) {
  return items
    .map((item, i) => {
      const checked = Boolean(checkedMap[i]);
      const id = `${dataAttr}-${i}`;
      return `
        <div class="checklist-item">
          <input type="checkbox" id="${id}" ${dataAttr}="${i}" ${checked ? "checked" : ""} />
          <label for="${id}">${esc(item)}</label>
        </div>`;
    })
    .join("");
}

function renderInterviewStep11() {
  const state = getInterviewState();
  const checkedCount = InterviewData.CHECKLIST_BEFORE.filter((_, i) => state.checklistBefore[i]).length;
  return `
    <h2 id="interview-step-heading">Step 11 — Before the Interview</h2>
    <p>Check these off as you get ready. <span class="checklist-progress">${checkedCount} / ${InterviewData.CHECKLIST_BEFORE.length} done</span></p>
    <div class="checklist" data-checklist="before">
      ${renderChecklist(InterviewData.CHECKLIST_BEFORE, state.checklistBefore, "data-before-item")}
    </div>
    <button type="button" class="btn btn-secondary btn-small" id="reset-before-btn">Reset checklist</button>
  `;
}

function renderInterviewStep12() {
  const state = getInterviewState();
  const checkedCount = InterviewData.CHECKLIST_DURING.filter((_, i) => state.checklistDuring[i]).length;
  return `
    <h2 id="interview-step-heading">Step 12 — During the Interview</h2>
    <p>Habits that consistently help candidates come across well. Use this as a quick mental checklist. <span class="checklist-progress">${checkedCount} / ${InterviewData.CHECKLIST_DURING.length} reviewed</span></p>
    <div class="checklist" data-checklist="during">
      ${renderChecklist(InterviewData.CHECKLIST_DURING, state.checklistDuring, "data-during-item")}
    </div>
    <button type="button" class="btn btn-secondary btn-small" id="reset-during-btn">Reset checklist</button>
  `;
}

function renderInterviewStep13() {
  const state = getInterviewState();
  const checkedCount = InterviewData.CHECKLIST_AFTER.filter((_, i) => state.checklistAfter[i]).length;
  return `
    <h2 id="interview-step-heading">Step 13 — After the Interview</h2>
    <p>What you do in the day or two afterward matters too. <span class="checklist-progress">${checkedCount} / ${InterviewData.CHECKLIST_AFTER.length} done</span></p>
    <div class="checklist" data-checklist="after">
      ${renderChecklist(InterviewData.CHECKLIST_AFTER, state.checklistAfter, "data-after-item")}
    </div>
    <button type="button" class="btn btn-secondary btn-small" id="reset-after-btn">Reset checklist</button>
  `;
}

// ---------- Step 14: Ready Check ----------

function renderInterviewStep14() {
  const state = getInterviewState();
  const counts = InterviewQuestions.countPracticed(InterviewData.QUESTIONS, state.answers);
  const behavioralPracticed = (counts.behavioral && counts.behavioral.practiced) || 0;
  const behavioralTotal = (counts.behavioral && counts.behavioral.total) || 0;
  const situationalPracticed = (counts.situational && counts.situational.practiced) || 0;
  const situationalTotal = (counts.situational && counts.situational.total) || 0;
  const technicalPracticed = (counts.technical && counts.technical.practiced) || 0;
  const technicalTotal = (counts.technical && counts.technical.total) || 0;

  const beforeChecked = InterviewData.CHECKLIST_BEFORE.filter((_, i) => state.checklistBefore[i]).length;
  const duringChecked = InterviewData.CHECKLIST_DURING.filter((_, i) => state.checklistDuring[i]).length;
  const afterChecked = InterviewData.CHECKLIST_AFTER.filter((_, i) => state.checklistAfter[i]).length;
  const reviewDone = InterviewData.SELF_REVIEW.behavioral.some((_, i) => state.reviewChecklist.behavioral[i])
    || InterviewData.SELF_REVIEW.technical.some((_, i) => state.reviewChecklist.technical[i]);

  const items = [
    { label: "Learned the interview process (Step 2)", done: state.completedSteps.includes(2) },
    { label: "Learned the STAR method (Step 3)", done: state.completedSteps.includes(3) },
    { label: `Saved at least one STAR story (${state.star.length} saved)`, done: state.star.length > 0 },
    { label: `Practiced "Tell Me About Yourself" (${state.tmayDraft.trim() ? "yes" : "not yet"})`, done: Boolean(state.tmayDraft.trim()) },
    { label: `Practiced behavioral questions (${behavioralPracticed} / ${behavioralTotal})`, done: behavioralPracticed >= 5 },
    { label: `Practiced situational questions (${situationalPracticed} / ${situationalTotal})`, done: situationalPracticed >= 5 },
    { label: "Reviewed technical interview prep (Step 7)", done: state.completedSteps.includes(7) },
    { label: `Practiced technical questions (${technicalPracticed} / ${technicalTotal})`, done: technicalPracticed >= 5 },
    { label: `Tried video practice at least once (${state.videoPracticeAttempted ? "yes" : "not yet"})`, done: state.videoPracticeAttempted },
    { label: "Used the self-review checklist at least once", done: reviewDone },
    { label: "Reviewed questions to ask the interviewer (Step 10)", done: state.completedSteps.includes(10) },
    { label: `Before-interview checklist (${beforeChecked} / ${InterviewData.CHECKLIST_BEFORE.length})`, done: beforeChecked === InterviewData.CHECKLIST_BEFORE.length },
    { label: `During-interview checklist reviewed (${duringChecked} / ${InterviewData.CHECKLIST_DURING.length})`, done: duringChecked === InterviewData.CHECKLIST_DURING.length },
    { label: `After-interview checklist (${afterChecked} / ${InterviewData.CHECKLIST_AFTER.length})`, done: afterChecked === InterviewData.CHECKLIST_AFTER.length },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  const rows = items
    .map((i) => `<div class="item-row"><div class="item-text item-title">${i.done ? "✅" : "⬜"} ${esc(i.label)}</div></div>`)
    .join("");

  const banner = pct === 100
    ? `<div class="ready-banner ready-complete">You're ready! 🎉 You've been through the whole interview-prep guide.</div>`
    : `<div class="ready-banner">You're ${pct}% through interview prep. Keep going — every step here helps.</div>`;

  return `
    <h2 id="interview-step-heading">Step 14 — Ready Check</h2>
    ${banner}
    <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Interview prep progress">
      <div class="progress-bar-fill" style="width: ${pct}%"></div>
    </div>
    <div class="pathway">${rows}</div>
    <p class="muted-note">This progress is saved only in this browser — it isn't sent anywhere.</p>
  `;
}

const INTERVIEW_STEP_RENDERERS = {
  1: renderInterviewStep1,
  2: renderInterviewStep2,
  3: renderInterviewStep3,
  4: renderInterviewStep4,
  5: renderInterviewStep5,
  6: renderInterviewStep6,
  7: renderInterviewStep7,
  8: renderInterviewStep8,
  9: renderInterviewStep9,
  10: renderInterviewStep10,
  11: renderInterviewStep11,
  12: renderInterviewStep12,
  13: renderInterviewStep13,
  14: renderInterviewStep14,
};

// ---------- Wiring ----------

function wireInterviewStep4(container) {
  const saveBtn = container.querySelector("#star-save-btn");
  const copyBtn = container.querySelector("#star-copy-btn");
  const clearBtn = container.querySelector("#star-clear-btn");
  const output = container.querySelector("#star-combined-output");
  const indicator = container.querySelector("#star-save-indicator");
  const fields = ["situation", "task", "action", "result"];

  const getFields = () => ({
    situation: container.querySelector("#star-situation").value,
    task: container.querySelector("#star-task").value,
    action: container.querySelector("#star-action").value,
    result: container.querySelector("#star-result").value,
  });

  fields.forEach((field) => {
    const el = container.querySelector(`#star-${field}`);
    if (!el) return;
    el.addEventListener("input", () => {
      const state = getInterviewState();
      state.starDraft = getFields();
      saveInterviewState(state);
      output.textContent = InterviewStar.buildStarAnswer(state.starDraft) || "Fill in the boxes above to see your combined practice answer here.";
      flashSaved(indicator);
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const formatted = InterviewStar.formatStarForClipboard(getFields());
      copyTextToClipboard(formatted, indicator, "Fill in at least one box before copying.");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const state = getInterviewState();
      state.starDraft = { situation: "", task: "", action: "", result: "" };
      saveInterviewState(state);
      render();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const fieldsValue = getFields();
      const combined = InterviewStar.buildStarAnswer(fieldsValue);
      if (!combined) {
        flashSaved(indicator);
        indicator.textContent = "Fill in at least one box before saving.";
        indicator.classList.add("visible");
        return;
      }
      const state = getInterviewState();
      state.star.push({ id: `star-${Date.now()}`, ...fieldsValue, combined, savedAt: new Date().toISOString() });
      saveInterviewState(state);
      render();
    });
  }

  container.querySelectorAll("[data-star-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const state = getInterviewState();
      state.star = state.star.filter((s) => s.id !== btn.dataset.starDelete);
      saveInterviewState(state);
      render();
    });
  });
}

function wireInterviewStep5(container) {
  const textarea = container.querySelector("#tmay-practice");
  const indicator = container.querySelector("#tmay-save-indicator");
  const copyBtn = container.querySelector("#tmay-copy-btn");
  const clearBtn = container.querySelector("#tmay-clear-btn");

  if (textarea) {
    textarea.addEventListener("input", () => {
      const state = getInterviewState();
      state.tmayDraft = textarea.value;
      saveInterviewState(state);
      flashSaved(indicator);
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      copyTextToClipboard(textarea.value, indicator, "Nothing to copy yet.");
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const state = getInterviewState();
      state.tmayDraft = "";
      saveInterviewState(state);
      render();
    });
  }
}

function wireQuestionBankStep(container) {
  const body = container.querySelector("#qb-body");

  function rerender() {
    body.innerHTML = renderQuestionBankBody();
    wireQuestionBankBody();
  }

  function wireQuestionBankBody() {
    body.querySelectorAll("[data-qb-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        qbFilters.category = btn.dataset.qbCategory;
        qbSelectedId = null;
        rerender();
      });
    });

    const searchInput = body.querySelector("#qb-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        qbFilters.keyword = searchInput.value;
        const list = body.querySelector("#qb-list");
        const countEl = body.querySelector(".qb-count");
        const currentList = qbCurrentList();
        const state = getInterviewState();
        list.innerHTML = currentList.length
          ? currentList.map((q) => qbCard(q, state)).join("")
          : `<p class="empty-state">No questions match your filters. Try clearing the search or filters.</p>`;
        if (countEl) countEl.textContent = `${currentList.length} question${currentList.length === 1 ? "" : "s"}`;
        wireListInteractions();
        if (!currentList.find((q) => q.id === qbSelectedId)) {
          qbSelectedId = currentList.length ? currentList[0].id : null;
          const detail = body.querySelector("#qb-detail");
          const state2 = getInterviewState();
          const selected = currentList.find((q) => q.id === qbSelectedId);
          detail.innerHTML = selected ? renderQbDetail(selected, state2) : `<p class="empty-state">Select a question from the list to practice it.</p>`;
          wireDetailInteractions();
        }
      });
    }

    const difficultySelect = body.querySelector("#qb-difficulty");
    if (difficultySelect) {
      difficultySelect.addEventListener("change", () => {
        qbFilters.difficulty = difficultySelect.value;
        rerender();
      });
    }

    const statusSelect = body.querySelector("#qb-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", () => {
        qbFilters.status = statusSelect.value;
        rerender();
      });
    }

    wireListInteractions();
    wireDetailInteractions();
  }

  function wireListInteractions() {
    body.querySelectorAll("[data-qb-select]").forEach((btn) => {
      btn.addEventListener("click", () => {
        qbSelectedId = btn.dataset.qbSelect;
        const detail = body.querySelector("#qb-detail");
        const state = getInterviewState();
        const q = InterviewData.QUESTIONS.find((item) => item.id === qbSelectedId);
        detail.innerHTML = q ? renderQbDetail(q, state) : "";
        wireDetailInteractions();
        body.querySelectorAll("[data-qb-select]").forEach((selectBtn) => {
          const card = selectBtn.closest(".qb-card");
          if (card) card.classList.toggle("selected", selectBtn.dataset.qbSelect === qbSelectedId);
        });
      });
    });

    body.querySelectorAll("[data-qb-favorite]").forEach((star) => {
      star.addEventListener("click", () => {
        const id = star.dataset.qbFavorite;
        const state = getInterviewState();
        const entry = getAnswerEntry(state, id);
        entry.favorite = !entry.favorite;
        state.answers[id] = entry;
        saveInterviewState(state);
        rerender();
      });
    });
  }

  function wireDetailInteractions() {
    const answerTextarea = body.querySelector("#qb-answer");
    const indicator = body.querySelector("#qb-save-indicator");
    if (answerTextarea) {
      answerTextarea.addEventListener("input", () => {
        const id = answerTextarea.dataset.questionId;
        const state = getInterviewState();
        const entry = getAnswerEntry(state, id);
        entry.text = answerTextarea.value;
        state.answers[id] = entry;
        saveInterviewState(state);
        flashSaved(indicator);
      });
    }

    const practicedBtn = body.querySelector("#qb-practiced-btn");
    if (practicedBtn) {
      practicedBtn.addEventListener("click", () => {
        const id = practicedBtn.dataset.questionId;
        const state = getInterviewState();
        const entry = getAnswerEntry(state, id);
        entry.practiced = !entry.practiced;
        state.answers[id] = entry;
        saveInterviewState(state);
        rerender();
      });
    }

    const copyBtn = body.querySelector("#qb-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const id = copyBtn.dataset.questionId;
        const state = getInterviewState();
        const entry = getAnswerEntry(state, id);
        copyTextToClipboard(entry.text, indicator, "Nothing to copy yet.");
      });
    }

    const clearBtn = body.querySelector("#qb-clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const id = clearBtn.dataset.questionId;
        const state = getInterviewState();
        const entry = getAnswerEntry(state, id);
        entry.text = "";
        state.answers[id] = entry;
        saveInterviewState(state);
        rerender();
      });
    }

    const prevBtn = body.querySelector("#qb-prev-btn");
    const nextBtn = body.querySelector("#qb-next-btn");
    const list = qbCurrentList();
    const idx = list.findIndex((q) => q.id === qbSelectedId);
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (idx > 0) {
          qbSelectedId = list[idx - 1].id;
          rerender();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (idx >= 0 && idx < list.length - 1) {
          qbSelectedId = list[idx + 1].id;
          rerender();
        }
      });
    }
  }

  wireQuestionBankBody();
}

function wireNestedChecklist(container, selectorAttr, group) {
  container.querySelectorAll(`[${selectorAttr}]`).forEach((input) => {
    input.addEventListener("change", () => {
      const idx = input.getAttribute(selectorAttr);
      const state = getInterviewState();
      state.reviewChecklist[group][idx] = input.checked;
      saveInterviewState(state);
      render();
    });
  });
}

function wireChecklist(container, selectorAttr, stateKey) {
  container.querySelectorAll(`[${selectorAttr}]`).forEach((input) => {
    input.addEventListener("change", () => {
      const idx = input.getAttribute(selectorAttr);
      const state = getInterviewState();
      state[stateKey][idx] = input.checked;
      saveInterviewState(state);
      render();
    });
  });
}

function wireChecklistReset(container, buttonId, stateKey) {
  const btn = container.querySelector(`#${buttonId}`);
  if (btn) {
    btn.addEventListener("click", () => {
      const state = getInterviewState();
      state[stateKey] = {};
      saveInterviewState(state);
      render();
    });
  }
}

function wireInterview(container, step) {
  if (step === 4) wireInterviewStep4(container);
  if (step === 5) wireInterviewStep5(container);
  if (step === 6) wireQuestionBankStep(container);
  if (step === 8) wireVideoStep(container);
  if (step === 9) {
    wireNestedChecklist(container, "data-review-behavioral-item", "behavioral");
    wireNestedChecklist(container, "data-review-technical-item", "technical");
  }
  if (step === 11) {
    wireChecklist(container, "data-before-item", "checklistBefore");
    wireChecklistReset(container, "reset-before-btn", "checklistBefore");
  }
  if (step === 12) {
    wireChecklist(container, "data-during-item", "checklistDuring");
    wireChecklistReset(container, "reset-during-btn", "checklistDuring");
  }
  if (step === 13) {
    wireChecklist(container, "data-after-item", "checklistAfter");
    wireChecklistReset(container, "reset-after-btn", "checklistAfter");
  }

  const nextBtn = container.querySelector("[data-interview-next]");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const current = parseInt(nextBtn.dataset.interviewNext, 10);
      markStepComplete(current);
      location.hash = `#/interview/${current + 1}`;
    });
  }
}
