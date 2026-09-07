const test = require("node:test");
const assert = require("node:assert/strict");
const { buildStarAnswer, starCompleteness, formatStarForClipboard } = require("./interview-star.js");

test("buildStarAnswer combines all four fields into one paragraph", () => {
  const answer = buildStarAnswer({
    situation: "Our sensor pipeline kept crashing under load.",
    task: "I owned the data ingestion module.",
    action: "I profiled it, added caching, and wrote regression tests.",
    result: "Processing time dropped 70% and we hit the deadline.",
  });
  assert.ok(answer.includes("sensor pipeline"));
  assert.ok(answer.includes("70%"));
});

test("buildStarAnswer handles empty entry without crashing", () => {
  assert.equal(buildStarAnswer({}), "");
  assert.equal(buildStarAnswer(null), "");
  assert.equal(buildStarAnswer(undefined), "");
});

test("buildStarAnswer handles partially filled entry", () => {
  const answer = buildStarAnswer({ situation: "A tough bug appeared.", result: "" });
  assert.equal(answer, "A tough bug appeared.");
});

test("starCompleteness reports how many of the four fields are filled", () => {
  assert.deepEqual(starCompleteness({ situation: "x", task: "y" }), { filled: 2, total: 4, isComplete: false });
  assert.deepEqual(
    starCompleteness({ situation: "a", task: "b", action: "c", result: "d" }),
    { filled: 4, total: 4, isComplete: true }
  );
  assert.deepEqual(starCompleteness({}), { filled: 0, total: 4, isComplete: false });
});

test("formatStarForClipboard labels each filled field on its own paragraph", () => {
  const formatted = formatStarForClipboard({
    situation: "Our sensor pipeline kept crashing.",
    task: "I owned the ingestion module.",
    action: "I profiled it and added caching.",
    result: "Processing time dropped 70%.",
  });
  assert.ok(formatted.startsWith("Situation: Our sensor pipeline"));
  assert.ok(formatted.includes("Task: I owned"));
  assert.ok(formatted.includes("Action: I profiled"));
  assert.ok(formatted.includes("Result: Processing time dropped 70%."));
});

test("formatStarForClipboard skips empty fields and handles a fully empty entry", () => {
  assert.equal(formatStarForClipboard({ situation: "Only this." }), "Situation: Only this.");
  assert.equal(formatStarForClipboard({}), "");
  assert.equal(formatStarForClipboard(null), "");
});
