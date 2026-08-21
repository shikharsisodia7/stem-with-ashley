// Interview Prep — a guided, step-by-step interview-readiness flow.
// Uses esc/safeGetJSON/safeSetJSON from utils.js and buildStarAnswer/starCompleteness
// from interview-star.js. Plain global functions, wired into app.js's router.

const INTERVIEW_STATE_KEY = "stemInterviewState";
const TOTAL_INTERVIEW_STEPS = 7;

const INTERVIEW_STEP_NAMES = [
  "Understand the Interview",
  "STAR Method",
  "Common Questions",
  "Before the Interview",
  "During the Interview",
  "After the Interview",
  "Ready Check",
];

const INTERVIEW_STAGES = [
  { name: "Recruiter / Screening Call", description: "A 20-30 minute call, usually with a recruiter, to check basic fit: your background, why you're interested, salary/timeline expectations, and a few resume questions. Low-pressure, but still your first impression." },
  { name: "Behavioral Interview", description: "Questions about how you've handled real situations in the past — teamwork, conflict, failure, leadership. This is where the STAR method (Step 2) really pays off." },
  { name: "Technical / Role-Specific Interview", description: "Digs into the actual skills the job needs: coding exercises for software roles, design or case questions for engineering roles, or a portfolio/project walkthrough for research and lab roles." },
  { name: "Hiring Manager Interview", description: "Usually later in the process. The person who would actually be your manager asks about how you work, what you're looking for, and whether you'd be a good fit for their team specifically." },
];

const STAR_EXAMPLE = {
  situation: "During my senior capstone project, our team's sensor data pipeline kept crashing under load about two weeks before the deadline.",
  task: "As the team member responsible for the data ingestion module, I needed to find and fix the bottleneck without derailing the rest of the team's testing schedule.",
  action: "I profiled the pipeline, found we were re-parsing the same file on every request, added a caching layer, and wrote three regression tests so the bug couldn't silently come back.",
  result: "Processing time dropped by about 70%, we hit our deadline, and two other teams ended up reusing the caching pattern I wrote.",
};

const COMMON_QUESTIONS = [
  "Tell me about yourself.",
  "Why are you interested in this role?",
  "Tell me about a project you're proud of.",
  "Tell me about a difficult problem you solved.",
  "Tell me about a time you worked on a team.",
  "Tell me about a challenge or failure.",
  "What are your strengths?",
  "Why should we hire you?",
  "What questions do you have for us?",
];

const CHECKLIST_BEFORE = [
  "Research the company (mission, products, recent news)",
  "Research the specific role and re-read the job description",
  "Prepare 2-3 project stories you can walk through in detail",
  "Prepare STAR examples for common behavioral questions",
  "Test your camera and microphone (for virtual interviews)",
  "Prepare a few thoughtful questions to ask the interviewer",
  "Review your resume — be ready to talk through anything on it",
  "Confirm the interview time, time zone, and location or video link",
  "For in-person interviews, plan your route and bring copies of your resume",
];

const DURING_GUIDANCE = [
  "Listen completely before you start forming your answer.",
  "It's OK to ask for clarification if a question is unclear.",
  "Think out loud for technical questions — interviewers want to see how you reason, not just the final answer.",
  "Use specific examples instead of vague generalities.",
  "Quantify results where you can (time saved, percent improved, people affected).",
  "If you don't know something, say so plainly, then explain how you'd find out.",
  "Show curiosity — ask follow-up questions about the team or the work.",
  "Save at least one or two of your prepared questions for the end.",
];

const CHECKLIST_AFTER = [
  "Send a short thank-you / follow-up message within a day",
  "Write down the questions you were actually asked, while they're fresh",
  "Note what went well",
  "Note one or two things to improve for next time",
  "Follow up politely if you haven't heard back by the timeline they gave you",
];

// ---------- State ----------

function getInterviewState() {
  const state = safeGetJSON(INTERVIEW_STATE_KEY, null);
  if (state && typeof state === "object") {
    return {
      completedSteps: Array.isArray(state.completedSteps) ? state.completedSteps : [],
      star: Array.isArray(state.star) ? state.star : [],
      questionAnswers: state.questionAnswers && typeof state.questionAnswers === "object" ? state.questionAnswers : {},
      checklistBefore: state.checklistBefore && typeof state.checklistBefore === "object" ? state.checklistBefore : {},
      checklistAfter: state.checklistAfter && typeof state.checklistAfter === "object" ? state.checklistAfter : {},
    };
  }
  return { completedSteps: [], star: [], questionAnswers: {}, checklistBefore: {}, checklistAfter: {} };
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
    <h1>Interview Prep</h1>
    <p>A friendly, step-by-step guide to your first industry interview. Nothing here is graded or submitted anywhere — it's just for you, saved in this browser.</p>
    ${interviewStepNav(step)}
    <section class="interview-step" aria-labelledby="interview-step-heading">
      ${body}
    </section>
    ${interviewStepFooter(step)}
  `;
}

// ---------- Step 1: Understand the Interview ----------

function renderInterviewStep1() {
  const rows = INTERVIEW_STAGES.map(
    (s, i) => `
      <div class="item-row">
        <div class="item-text">
          <div class="item-title">${i + 1}. ${esc(s.name)}</div>
          <p>${esc(s.description)}</p>
        </div>
      </div>`
  ).join("");

  return `
    <h2 id="interview-step-heading">Step 1 — Understand the Interview</h2>
    <p>An "industry interview" just means a structured conversation where a company decides whether you and the role are a good match — and you decide the same thing about them. Most STEM interview processes move through some or all of these stages:</p>
    <div class="pathway">${rows}</div>
    <p>Not every process includes all four, and the order can vary. Smaller companies often combine stages; larger companies usually keep them separate.</p>
  `;
}

// ---------- Step 2: STAR Method ----------

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

function renderInterviewStep2() {
  const state = getInterviewState();
  const savedRows = state.star.map(starEntryRow).join("");
  const savedSection = state.star.length
    ? `<h3>Your saved practice answers</h3>${savedRows}`
    : "";

  return `
    <h2 id="interview-step-heading">Step 2 — The STAR Method</h2>
    <p>STAR is a simple structure for answering behavioral questions ("tell me about a time when...") so your answer has a clear beginning, middle, and end instead of rambling.</p>
    <ul>
      <li><strong>Situation</strong> — briefly set the scene. What was going on?</li>
      <li><strong>Task</strong> — what were you specifically responsible for?</li>
      <li><strong>Action</strong> — what did you actually do, step by step?</li>
      <li><strong>Result</strong> — what happened? Numbers and outcomes help.</li>
    </ul>

    <h3>Example (STEM student)</h3>
    <div class="star-example">
      <p><strong>Situation:</strong> ${esc(STAR_EXAMPLE.situation)}</p>
      <p><strong>Task:</strong> ${esc(STAR_EXAMPLE.task)}</p>
      <p><strong>Action:</strong> ${esc(STAR_EXAMPLE.action)}</p>
      <p><strong>Result:</strong> ${esc(STAR_EXAMPLE.result)}</p>
    </div>

    <h3>Build your own STAR answer</h3>
    <p>Think of one real project, class, job, or club experience. Fill in each box in a sentence or two, then combine them into a practice answer.</p>
    <form id="star-builder-form" class="star-builder">
      <div class="form-field">
        <label for="star-situation">Situation</label>
        <textarea id="star-situation" rows="2" placeholder="What was going on?"></textarea>
      </div>
      <div class="form-field">
        <label for="star-task">Task</label>
        <textarea id="star-task" rows="2" placeholder="What were you responsible for?"></textarea>
      </div>
      <div class="form-field">
        <label for="star-action">Action</label>
        <textarea id="star-action" rows="2" placeholder="What did you do, step by step?"></textarea>
      </div>
      <div class="form-field">
        <label for="star-result">Result</label>
        <textarea id="star-result" rows="2" placeholder="What happened? Use numbers if you can."></textarea>
      </div>
      <div class="star-builder-actions">
        <button type="button" class="btn" id="star-combine-btn">Combine into practice answer</button>
        <button type="button" class="btn btn-secondary" id="star-save-btn">Save this answer</button>
      </div>
    </form>
    <div id="star-combined-output" class="star-combined-output" aria-live="polite"></div>

    ${savedSection}
  `;
}

// ---------- Step 3: Common Interview Questions ----------

function renderInterviewStep3(questionIndex) {
  const idx = Math.min(COMMON_QUESTIONS.length - 1, Math.max(0, questionIndex || 0));
  const state = getInterviewState();
  const savedAnswer = state.questionAnswers[idx] || "";

  const chips = COMMON_QUESTIONS.map((q, i) => {
    const answered = Boolean(state.questionAnswers[i] && state.questionAnswers[i].trim());
    const classes = ["chip", "question-chip"];
    if (i === idx) classes.push("active");
    if (answered) classes.push("answered");
    return `<button type="button" class="${classes.join(" ")}" data-question-jump="${i}">${i + 1}${answered ? " ✓" : ""}</button>`;
  }).join("");

  return `
    <h2 id="interview-step-heading">Step 3 — Common Interview Questions</h2>
    <p>These are nine questions that show up in almost every first industry interview. Click through them one at a time and jot down a short practice answer for each — it's saved in this browser as you go.</p>
    <div class="chip-list question-jump-list" role="group" aria-label="Jump to question">${chips}</div>

    <div class="question-nav">
      <button type="button" class="btn btn-secondary" id="question-prev-btn" ${idx === 0 ? "disabled" : ""}>&larr; Previous</button>
      <span class="question-counter">Question ${idx + 1} of ${COMMON_QUESTIONS.length}</span>
      <button type="button" class="btn btn-secondary" id="question-next-btn" ${idx === COMMON_QUESTIONS.length - 1 ? "disabled" : ""}>Next &rarr;</button>
    </div>

    <div class="question-card">
      <p class="question-text">"${esc(COMMON_QUESTIONS[idx])}"</p>
      <div class="form-field">
        <label for="question-answer">Your practice answer</label>
        <textarea id="question-answer" rows="4" data-question-index="${idx}" placeholder="Type a short practice answer...">${esc(savedAnswer)}</textarea>
      </div>
    </div>
  `;
}

// ---------- Step 4: Before the Interview (checklist) ----------

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

function renderInterviewStep4() {
  const state = getInterviewState();
  const checkedCount = CHECKLIST_BEFORE.filter((_, i) => state.checklistBefore[i]).length;
  return `
    <h2 id="interview-step-heading">Step 4 — Before the Interview</h2>
    <p>Check these off as you get ready. <span class="checklist-progress">${checkedCount} / ${CHECKLIST_BEFORE.length} done</span></p>
    <div class="checklist" data-checklist="before">
      ${renderChecklist(CHECKLIST_BEFORE, state.checklistBefore, "data-before-item")}
    </div>
  `;
}

// ---------- Step 5: During the Interview ----------

function renderInterviewStep5() {
  const rows = DURING_GUIDANCE.map((g) => `<li>${esc(g)}</li>`).join("");
  return `
    <h2 id="interview-step-heading">Step 5 — During the Interview</h2>
    <p>A few habits that consistently help candidates come across well:</p>
    <ul class="guidance-list">${rows}</ul>
  `;
}

// ---------- Step 6: After the Interview (checklist) ----------

function renderInterviewStep6() {
  const state = getInterviewState();
  const checkedCount = CHECKLIST_AFTER.filter((_, i) => state.checklistAfter[i]).length;
  return `
    <h2 id="interview-step-heading">Step 6 — After the Interview</h2>
    <p>What you do in the day or two afterward matters too. <span class="checklist-progress">${checkedCount} / ${CHECKLIST_AFTER.length} done</span></p>
    <div class="checklist" data-checklist="after">
      ${renderChecklist(CHECKLIST_AFTER, state.checklistAfter, "data-after-item")}
    </div>
  `;
}

// ---------- Step 7: Ready Check ----------

function renderInterviewStep7() {
  const state = getInterviewState();
  const questionsAnswered = COMMON_QUESTIONS.filter((_, i) => state.questionAnswers[i] && state.questionAnswers[i].trim()).length;
  const beforeChecked = CHECKLIST_BEFORE.filter((_, i) => state.checklistBefore[i]).length;
  const afterChecked = CHECKLIST_AFTER.filter((_, i) => state.checklistAfter[i]).length;
  const starCount = state.star.length;
  const coreStepsDone = [1, 2, 3, 4, 5, 6].filter((s) => state.completedSteps.includes(s)).length;

  const items = [
    { label: "Learned the interview stages (Step 1)", done: state.completedSteps.includes(1) },
    { label: `Saved at least one STAR practice answer (${starCount} saved)`, done: starCount > 0 },
    { label: `Practiced common questions (${questionsAnswered} / ${COMMON_QUESTIONS.length} answered)`, done: questionsAnswered >= Math.ceil(COMMON_QUESTIONS.length / 2) },
    { label: `Before-interview checklist (${beforeChecked} / ${CHECKLIST_BEFORE.length})`, done: beforeChecked === CHECKLIST_BEFORE.length },
    { label: "Reviewed during-interview guidance (Step 5)", done: state.completedSteps.includes(5) },
    { label: `After-interview checklist (${afterChecked} / ${CHECKLIST_AFTER.length})`, done: afterChecked === CHECKLIST_AFTER.length },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  const rows = items
    .map(
      (i) => `<div class="item-row">
        <div class="item-text item-title">${i.done ? "✅" : "⬜"} ${esc(i.label)}</div>
      </div>`
    )
    .join("");

  const banner =
    pct === 100
      ? `<div class="ready-banner ready-complete">You're ready! 🎉 You've been through the whole interview-prep flow.</div>`
      : `<div class="ready-banner">You're ${pct}% through interview prep. Keep going — every step here helps.</div>`;

  return `
    <h2 id="interview-step-heading">Step 7 — Ready Check</h2>
    ${banner}
    <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Interview prep progress">
      <div class="progress-bar-fill" style="width: ${pct}%"></div>
    </div>
    <div class="pathway">${rows}</div>
    <p class="muted-note">(${coreStepsDone} of 6 content steps marked complete.) This progress is saved only in this browser — it isn't sent anywhere.</p>
  `;
}

const INTERVIEW_STEP_RENDERERS = {
  1: renderInterviewStep1,
  2: renderInterviewStep2,
  3: () => renderInterviewStep3(0),
  4: renderInterviewStep4,
  5: renderInterviewStep5,
  6: renderInterviewStep6,
  7: renderInterviewStep7,
};

// ---------- Wiring ----------

function wireInterviewStep2(container) {
  const combineBtn = container.querySelector("#star-combine-btn");
  const saveBtn = container.querySelector("#star-save-btn");
  const output = container.querySelector("#star-combined-output");
  const getFields = () => ({
    situation: container.querySelector("#star-situation").value,
    task: container.querySelector("#star-task").value,
    action: container.querySelector("#star-action").value,
    result: container.querySelector("#star-result").value,
  });

  if (combineBtn) {
    combineBtn.addEventListener("click", () => {
      const combined = InterviewStar.buildStarAnswer(getFields());
      output.textContent = combined || "Fill in at least one box above, then combine again.";
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const fields = getFields();
      const combined = InterviewStar.buildStarAnswer(fields);
      if (!combined) {
        output.textContent = "Fill in at least one box above before saving.";
        return;
      }
      const state = getInterviewState();
      state.star.push({ id: `star-${Date.now()}`, ...fields, combined, savedAt: new Date().toISOString() });
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

function wireInterviewStep3(container, questionIndex) {
  const textarea = container.querySelector("#question-answer");
  if (textarea) {
    textarea.addEventListener("input", () => {
      const state = getInterviewState();
      state.questionAnswers[questionIndex] = textarea.value;
      saveInterviewState(state);
    });
  }

  container.querySelectorAll("[data-question-jump]").forEach((chip) => {
    chip.addEventListener("click", () => {
      renderQuestionStep(container, parseInt(chip.dataset.questionJump, 10));
    });
  });

  const prevBtn = container.querySelector("#question-prev-btn");
  const nextBtn = container.querySelector("#question-next-btn");
  if (prevBtn) prevBtn.addEventListener("click", () => renderQuestionStep(container, questionIndex - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => renderQuestionStep(container, questionIndex + 1));
}

function renderQuestionStep(container, newIndex) {
  const stepSection = container.querySelector(".interview-step");
  stepSection.innerHTML = renderInterviewStep3(newIndex);
  wireInterviewStep3(container, Math.min(COMMON_QUESTIONS.length - 1, Math.max(0, newIndex)));
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

function wireInterview(container, step) {
  if (step === 2) wireInterviewStep2(container);
  if (step === 3) wireInterviewStep3(container, 0);
  if (step === 4) wireChecklist(container, "data-before-item", "checklistBefore");
  if (step === 6) wireChecklist(container, "data-after-item", "checklistAfter");

  const nextBtn = container.querySelector("[data-interview-next]");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const current = parseInt(nextBtn.dataset.interviewNext, 10);
      markStepComplete(current);
      location.hash = `#/interview/${current + 1}`;
    });
  }
}
