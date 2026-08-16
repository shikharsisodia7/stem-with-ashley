const test = require("node:test");
const assert = require("node:assert/strict");
const { filterJobs } = require("./jobs-filter.js");

const SAMPLE = [
  { id: "a", title: "Software Engineer I", company: "Acme", fieldId: "computer-science-software-engineering", experienceLevel: "new-grad", location: "Remote", remote: true, description: "Build web apps." },
  { id: "b", title: "Structural EIT", company: "BuildCo", fieldId: "civil-engineering", experienceLevel: "internship", location: "Denver, CO", remote: false, description: "Support bridge design." },
  { id: "c", title: "Process Engineer", company: "ChemCo", fieldId: "chemical-engineering", experienceLevel: "1-3-years", location: "Houston, TX", remote: false, description: "Optimize plant yield." },
];

test("filterJobs with no filters returns all jobs", () => {
  assert.equal(filterJobs(SAMPLE, {}).length, 3);
});

test("filterJobs filters by fieldId", () => {
  const result = filterJobs(SAMPLE, { fieldId: "civil-engineering" });
  assert.deepEqual(result.map((j) => j.id), ["b"]);
});

test("filterJobs filters by experienceLevel", () => {
  const result = filterJobs(SAMPLE, { experienceLevel: "internship" });
  assert.deepEqual(result.map((j) => j.id), ["b"]);
});

test("filterJobs filters by keyword across title/company/description", () => {
  const result = filterJobs(SAMPLE, { keyword: "bridge" });
  assert.deepEqual(result.map((j) => j.id), ["b"]);
});

test("filterJobs filters by remote location", () => {
  const result = filterJobs(SAMPLE, { location: "remote" });
  assert.deepEqual(result.map((j) => j.id), ["a"]);
});

test("filterJobs filters by partial location text", () => {
  const result = filterJobs(SAMPLE, { location: "Houston" });
  assert.deepEqual(result.map((j) => j.id), ["c"]);
});

test("filterJobs combines multiple filters", () => {
  const result = filterJobs(SAMPLE, { fieldId: "chemical-engineering", experienceLevel: "1-3-years" });
  assert.deepEqual(result.map((j) => j.id), ["c"]);
});
