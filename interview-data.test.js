// Structural validation for interview-data.js — catches malformed content edits
// (duplicate ids, missing tips, bad counts) before they reach the live site.
// Run with: node --test interview-data.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const InterviewData = require("./interview-data.js");

test("question ids are unique", () => {
  const ids = InterviewData.QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate question id found");
});

test("question ids are kebab-case, non-empty strings", () => {
  InterviewData.QUESTIONS.forEach((q) => {
    assert.match(q.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `question id "${q.id}" is not kebab-case`);
  });
});

test("at least 35 behavioral questions", () => {
  const count = InterviewData.QUESTIONS.filter((q) => q.category === "behavioral").length;
  assert.ok(count >= 35, `expected >=35 behavioral questions, found ${count}`);
});

test("at least 25 situational questions", () => {
  const count = InterviewData.QUESTIONS.filter((q) => q.category === "situational").length;
  assert.ok(count >= 25, `expected >=25 situational questions, found ${count}`);
});

test("at least 40 technical questions", () => {
  const count = InterviewData.QUESTIONS.filter((q) => q.category === "technical").length;
  assert.ok(count >= 40, `expected >=40 technical questions, found ${count}`);
});

test("every question has required fields with sane values", () => {
  const validCategories = ["behavioral", "situational", "technical"];
  const validDifficulties = ["introductory", "intermediate", "advanced"];
  InterviewData.QUESTIONS.forEach((q) => {
    assert.ok(validCategories.includes(q.category), `question "${q.id}" has invalid category "${q.category}"`);
    assert.ok(validDifficulties.includes(q.difficulty), `question "${q.id}" has invalid difficulty "${q.difficulty}"`);
    assert.ok(q.question && q.question.trim(), `question "${q.id}" has no question text`);
    assert.ok(q.subcategory && q.subcategory.trim(), `question "${q.id}" has no subcategory`);
    assert.ok(q.tip && q.tip.trim(), `question "${q.id}" has no tip`);
    assert.ok(Array.isArray(q.evaluates) && q.evaluates.length > 0, `question "${q.id}" has no evaluates`);
    assert.ok(Array.isArray(q.tags), `question "${q.id}" tags should be an array`);
    assert.equal(typeof q.starRecommended, "boolean", `question "${q.id}" starRecommended should be a boolean`);
  });
});

test("no two questions have identical question text", () => {
  const texts = InterviewData.QUESTIONS.map((q) => q.question.trim().toLowerCase());
  assert.equal(new Set(texts).size, texts.length, "duplicate question text found");
});

test("checklist arrays have no duplicate or empty items", () => {
  ["CHECKLIST_BEFORE", "CHECKLIST_DURING", "CHECKLIST_AFTER"].forEach((key) => {
    const items = InterviewData[key];
    assert.ok(Array.isArray(items) && items.length > 0, `${key} should be a non-empty array`);
    items.forEach((item) => assert.ok(item && item.trim(), `${key} has an empty item`));
    assert.equal(new Set(items).size, items.length, `${key} has duplicate items`);
  });
});

test("self-review checklists each have at least 10 items", () => {
  assert.ok(InterviewData.SELF_REVIEW.behavioral.length >= 10);
  assert.ok(InterviewData.SELF_REVIEW.technical.length >= 10);
});

test("STAGES cover the interview process with name and description", () => {
  assert.ok(InterviewData.STAGES.length >= 8);
  InterviewData.STAGES.forEach((s) => {
    assert.ok(s.name && s.name.trim());
    assert.ok(s.description && s.description.trim());
  });
});

test("STAR_EXAMPLE has all four parts and does not name a real person", () => {
  const ex = InterviewData.STAR_EXAMPLE;
  ["situation", "task", "action", "result"].forEach((k) => assert.ok(ex[k] && ex[k].trim()));
  assert.doesNotMatch(ex.situation + ex.task + ex.action + ex.result, /Ashley|Shikhar/i);
});

test("TECHNICAL_PREP has data structures, algorithms, complexity, workflow, and edge cases", () => {
  const p = InterviewData.TECHNICAL_PREP;
  assert.ok(p.dataStructures.length >= 8);
  assert.ok(p.algorithms.length >= 8);
  assert.ok(p.complexity.length >= 4);
  assert.ok(p.workflow.length >= 10);
  assert.ok(p.edgeCases.length >= 8);
  p.dataStructures.forEach((ds) => {
    assert.ok(ds.name && ds.whatItIs && ds.goodFor && ds.operations, `data structure "${ds.name}" is missing a field`);
  });
});

test("INTERVIEWER_QUESTIONS covers at least 4 groups with questions", () => {
  assert.ok(InterviewData.INTERVIEWER_QUESTIONS.groups.length >= 4);
  InterviewData.INTERVIEWER_QUESTIONS.groups.forEach((g) => {
    assert.ok(g.questions.length > 0, `interviewer question group "${g.key}" has no questions`);
  });
});
