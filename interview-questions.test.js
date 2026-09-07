const test = require("node:test");
const assert = require("node:assert/strict");
const { filterQuestions, countByCategory, countPracticed, findQuestionIndex } = require("./interview-questions.js");

const SAMPLE = [
  { id: "a", category: "behavioral", subcategory: "General", question: "Tell me about yourself.", difficulty: "introductory", evaluates: ["Communication"], tags: ["intro"] },
  { id: "b", category: "behavioral", subcategory: "Teamwork", question: "Tell me about a difficult teammate.", difficulty: "intermediate", evaluates: ["Collaboration"], tags: ["teamwork"] },
  { id: "c", category: "situational", subcategory: "Deadlines", question: "What if you missed a deadline?", difficulty: "intermediate", evaluates: ["Communication"], tags: ["deadlines"] },
  { id: "d", category: "technical", subcategory: "Coding", question: "Reverse a string.", difficulty: "introductory", evaluates: ["Strings"], tags: ["strings"] },
];

test("filterQuestions with no filters returns everything", () => {
  assert.equal(filterQuestions(SAMPLE, {}).length, 4);
  assert.equal(filterQuestions(SAMPLE, null).length, 4);
});

test("filterQuestions filters by category", () => {
  const result = filterQuestions(SAMPLE, { category: "behavioral" });
  assert.equal(result.length, 2);
  assert.ok(result.every((q) => q.category === "behavioral"));
});

test("filterQuestions filters by difficulty", () => {
  const result = filterQuestions(SAMPLE, { difficulty: "introductory" });
  assert.equal(result.length, 2);
});

test("filterQuestions matches keyword against question text, subcategory, and tags", () => {
  assert.equal(filterQuestions(SAMPLE, { keyword: "teammate" }).length, 1);
  assert.equal(filterQuestions(SAMPLE, { keyword: "teamwork" }).length, 1);
  assert.equal(filterQuestions(SAMPLE, { keyword: "TEAMWORK" }).length, 1, "search should be case-insensitive");
  assert.equal(filterQuestions(SAMPLE, { keyword: "nonexistent-topic" }).length, 0);
});

test("filterQuestions filters by practiced/unpracticed/favorites status", () => {
  const progress = { a: { practiced: true }, b: { favorite: true } };
  assert.equal(filterQuestions(SAMPLE, { status: "practiced", progress }).length, 1);
  assert.equal(filterQuestions(SAMPLE, { status: "unpracticed", progress }).length, 3);
  assert.equal(filterQuestions(SAMPLE, { status: "favorites", progress }).length, 1);
});

test("filterQuestions combines multiple filters", () => {
  const result = filterQuestions(SAMPLE, { category: "behavioral", keyword: "yourself" });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("countByCategory tallies each category", () => {
  assert.deepEqual(countByCategory(SAMPLE), { behavioral: 2, situational: 1, technical: 1 });
});

test("countPracticed tallies total and practiced per category", () => {
  const progress = { a: { practiced: true }, d: { practiced: true } };
  const result = countPracticed(SAMPLE, progress);
  assert.deepEqual(result.behavioral, { total: 2, practiced: 1 });
  assert.deepEqual(result.technical, { total: 1, practiced: 1 });
  assert.deepEqual(result.situational, { total: 1, practiced: 0 });
});

test("findQuestionIndex locates a question by id", () => {
  assert.equal(findQuestionIndex(SAMPLE, "c"), 2);
  assert.equal(findQuestionIndex(SAMPLE, "missing"), -1);
});
