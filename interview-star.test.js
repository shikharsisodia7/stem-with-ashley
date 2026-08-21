const test = require("node:test");
const assert = require("node:assert/strict");
const { buildStarAnswer, starCompleteness } = require("./interview-star.js");

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
