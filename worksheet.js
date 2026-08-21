// Worksheet Generator — UI layer. All text from WorksheetGenerator (worksheet-generator.js)
// is untrusted/unescaped by design; every value below goes through esc() (utils.js)
// before it touches innerHTML. Notes never leave the browser — no fetch/XHR here.

const WORKSHEET_STATE_KEY = "stemWorksheetState";

function getWorksheetState() {
  const state = safeGetJSON(WORKSHEET_STATE_KEY, null);
  if (state && typeof state === "object") {
    return {
      title: typeof state.title === "string" ? state.title : "",
      notes: typeof state.notes === "string" ? state.notes : "",
      numQuestions: Number.isFinite(state.numQuestions) ? state.numQuestions : 8,
      difficulty: ["easy", "medium", "hard"].includes(state.difficulty) ? state.difficulty : "medium",
      showAnswerKey: Boolean(state.showAnswerKey),
      lastResult: state.lastResult && typeof state.lastResult === "object" ? state.lastResult : null,
    };
  }
  return { title: "", notes: "", numQuestions: 8, difficulty: "medium", showAnswerKey: false, lastResult: null };
}

function saveWorksheetState(state) {
  safeSetJSON(WORKSHEET_STATE_KEY, state);
}

function renderWorksheet() {
  const state = getWorksheetState();

  return `
    <a class="back-link" href="#/">&larr; Back to all fields</a>
    <h1>Worksheet Generator</h1>
    <p class="privacy-note">🔒 Your notes stay in this browser. Nothing is uploaded, saved to a server, or sent anywhere — generating a worksheet works completely offline.</p>
    <p>Paste class notes, a lesson summary, or study notes below, and this tool turns them into a printable practice worksheet: fill-in-the-blank sentences, key terms, and short-answer prompts, with an optional answer key.</p>

    <form id="worksheet-form" class="worksheet-form no-print">
      <div class="form-field">
        <label for="worksheet-title">Title / topic</label>
        <input type="text" id="worksheet-title" placeholder="e.g. Photosynthesis, Newton's Laws, SQL Joins" value="${esc(state.title)}" />
      </div>
      <div class="form-field">
        <label for="worksheet-notes">Notes / summary</label>
        <textarea id="worksheet-notes" rows="10" placeholder="Paste class notes, a lesson summary, or a topic explanation here...">${esc(state.notes)}</textarea>
      </div>
      <div class="worksheet-form-row">
        <div class="form-field form-field-inline">
          <label for="worksheet-num-questions">Number of questions</label>
          <input type="number" id="worksheet-num-questions" min="4" max="15" value="${esc(String(state.numQuestions))}" />
        </div>
        <div class="form-field form-field-inline">
          <label for="worksheet-difficulty">Difficulty</label>
          <select id="worksheet-difficulty">
            <option value="easy" ${state.difficulty === "easy" ? "selected" : ""}>Easier (fewer, more obvious blanks)</option>
            <option value="medium" ${state.difficulty === "medium" ? "selected" : ""}>Medium</option>
            <option value="hard" ${state.difficulty === "hard" ? "selected" : ""}>Harder (more blanks per sentence)</option>
          </select>
        </div>
      </div>
      <button type="button" class="btn" id="worksheet-generate-btn">Generate Worksheet</button>
    </form>

    <div id="worksheet-output" aria-live="polite">
      ${state.lastResult ? renderWorksheetOutput(state.lastResult, state.showAnswerKey) : ""}
    </div>
  `;
}

function renderWorksheetOutput(worksheet, showAnswerKey) {
  if (!worksheet || worksheet.isEmpty) {
    return `<p class="empty-state">${esc((worksheet && worksheet.warning) || "Paste some notes above, then click Generate Worksheet.")}</p>`;
  }

  const keyTermsHtml = worksheet.keyTerms
    .map((t, i) => `<li>${i + 1}. <strong>${esc(t.term)}</strong> — <span class="write-line" aria-hidden="true"></span></li>`)
    .join("");

  const fillBlankHtml = worksheet.fillBlank
    .map((item, i) => `<li>${i + 1}. ${esc(item.prompt)}</li>`)
    .join("");

  const shortAnswerHtml = worksheet.shortAnswer
    .map(
      (item, i) => `<li>${i + 1}. ${esc(item.prompt)}<div class="write-lines" aria-hidden="true"></div></li>`
    )
    .join("");

  const answerKeyHtml = showAnswerKey
    ? `
      <section class="worksheet-section answer-key">
        <h2>Answer Key</h2>
        ${
          worksheet.keyTerms.length
            ? `<h3>Key Terms</h3><ol>${worksheet.keyTerms
                .map((t) => `<li><strong>${esc(t.term)}</strong>${t.contextSentence ? ` — ${esc(t.contextSentence)}` : ""}</li>`)
                .join("")}</ol>`
            : ""
        }
        ${
          worksheet.fillBlank.length
            ? `<h3>Fill in the Blank</h3><ol>${worksheet.fillBlank.map((item) => `<li>${esc(item.answer)}</li>`).join("")}</ol>`
            : ""
        }
        ${
          worksheet.shortAnswer.length
            ? `<h3>Short Answer</h3><p class="muted-note">Answers will vary. A strong answer should touch on:</p><ol>${worksheet.shortAnswer
                .map((item) => `<li>${esc(item.referenceNote || "(based on your notes)")}</li>`)
                .join("")}</ol>`
            : ""
        }
      </section>`
    : "";

  return `
    <div class="worksheet-toolbar no-print">
      <label class="answer-key-toggle">
        <input type="checkbox" id="worksheet-answer-key-toggle" ${showAnswerKey ? "checked" : ""} />
        Show answer key
      </label>
      <button type="button" class="btn" id="worksheet-print-btn">Print Worksheet</button>
    </div>

    <article class="worksheet-sheet">
      <header class="worksheet-sheet-header">
        <h2>${esc(worksheet.title)}</h2>
        <p class="worksheet-sheet-meta">Name: <span class="write-line-inline" aria-hidden="true"></span> &nbsp; Date: <span class="write-line-inline" aria-hidden="true"></span></p>
      </header>

      ${worksheet.keyTerms.length ? `<section class="worksheet-section"><h2>Key Terms</h2><p class="muted-note">Define each term in your own words.</p><ol>${keyTermsHtml}</ol></section>` : ""}

      ${worksheet.fillBlank.length ? `<section class="worksheet-section"><h2>Fill in the Blank</h2><ol>${fillBlankHtml}</ol></section>` : ""}

      ${worksheet.shortAnswer.length ? `<section class="worksheet-section"><h2>Short Answer</h2><ol>${shortAnswerHtml}</ol></section>` : ""}
    </article>

    ${answerKeyHtml}
  `;
}

function runWorksheetGeneration(container) {
  const title = container.querySelector("#worksheet-title").value;
  const notes = container.querySelector("#worksheet-notes").value;
  const numQuestions = parseInt(container.querySelector("#worksheet-num-questions").value, 10);
  const difficulty = container.querySelector("#worksheet-difficulty").value;

  const worksheet = WorksheetGenerator.generateWorksheet({ title, notes, numQuestions, difficulty });

  const state = getWorksheetState();
  state.title = title;
  state.notes = notes;
  state.numQuestions = numQuestions;
  state.difficulty = difficulty;
  state.lastResult = worksheet;
  saveWorksheetState(state);

  const output = container.querySelector("#worksheet-output");
  output.innerHTML = renderWorksheetOutput(worksheet, state.showAnswerKey);
  wireWorksheetOutput(container);
  output.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wireWorksheetOutput(container) {
  const toggle = container.querySelector("#worksheet-answer-key-toggle");
  if (toggle) {
    toggle.addEventListener("change", () => {
      const state = getWorksheetState();
      state.showAnswerKey = toggle.checked;
      saveWorksheetState(state);
      const output = container.querySelector("#worksheet-output");
      output.innerHTML = renderWorksheetOutput(state.lastResult, state.showAnswerKey);
      wireWorksheetOutput(container);
    });
  }
  const printBtn = container.querySelector("#worksheet-print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }
}

function wireWorksheet(container) {
  const generateBtn = container.querySelector("#worksheet-generate-btn");
  if (generateBtn) {
    generateBtn.addEventListener("click", () => runWorksheetGeneration(container));
  }
  wireWorksheetOutput(container);
}
