// Pure STAR-answer-combining logic, kept separate from interview.js (which
// touches the DOM) so it can be unit-tested with plain Node.

(function (global) {
  function buildStarAnswer(entry) {
    const situation = (entry && entry.situation ? String(entry.situation) : "").trim();
    const task = (entry && entry.task ? String(entry.task) : "").trim();
    const action = (entry && entry.action ? String(entry.action) : "").trim();
    const result = (entry && entry.result ? String(entry.result) : "").trim();

    const parts = [situation, task, action, result].filter(Boolean);
    if (parts.length === 0) return "";

    return parts.join(" ");
  }

  function starCompleteness(entry) {
    const fields = ["situation", "task", "action", "result"];
    const filled = fields.filter((f) => entry && String(entry[f] || "").trim().length > 0);
    return { filled: filled.length, total: fields.length, isComplete: filled.length === fields.length };
  }

  const api = { buildStarAnswer, starCompleteness };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.InterviewStar = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
