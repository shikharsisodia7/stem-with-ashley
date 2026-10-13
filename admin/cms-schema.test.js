// Unit tests for the admin content schema (validation, sanitizing, change
// summaries, file parsing). Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("./cms-schema.js");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
function liveDocs() {
  return {
    roadmap: S.parseDoc("roadmap", read("data/roadmap-data.json")),
    jobs: S.parseDoc("jobs", read("jobs/jobs-data.js")),
    interview: S.parseDoc("interview", read("interview-data.js")),
  };
}
const clone = (v) => JSON.parse(JSON.stringify(v));

test("all live content parses and passes validation", () => {
  assert.deepEqual(S.validateDocs(liveDocs()), []);
});

test("sanitizing live content changes nothing (byte-identical JSON, same key order)", () => {
  const docs = liveDocs();
  for (const name of S.DOC_NAMES) {
    assert.equal(JSON.stringify(S.sanitizeDoc(name, docs[name])), JSON.stringify(docs[name]), name);
    assert.equal(JSON.stringify(S.mergeManaged(name, docs[name], docs[name])), JSON.stringify(docs[name]), name);
  }
});

test("marked documents round-trip through serialize/parse and keep their surrounding code", () => {
  for (const name of ["jobs", "interview"]) {
    const text = read(S.DOCS[name].path).replace(/\r\n/g, "\n");
    const data = S.parseDoc(name, text);
    const again = S.serializeDoc(name, data, text);
    assert.deepEqual(S.parseDoc(name, again), data);
    assert.equal(again.slice(0, text.indexOf(S.MARK_START)), text.slice(0, text.indexOf(S.MARK_START)));
  }
  assert.throws(() => S.parseDoc("jobs", "const SAMPLE_JOBS = [];"), /markers/);
});

test("serialized marked documents still load as browser scripts", () => {
  const vm = require("node:vm");
  const docs = liveDocs();
  docs.jobs.push({ id: "job-99", title: "T", company: "C", fieldId: "civil-engineering", experienceLevel: "new-grad", location: "X", remote: false, description: "D", isSampleData: true });
  const jobsText = S.serializeDoc("jobs", docs.jobs, read("jobs/jobs-data.js"));
  const ctx = {};
  vm.runInNewContext(`${jobsText}\nthis.out = SAMPLE_JOBS;`, ctx);
  assert.equal(ctx.out.length, docs.jobs.length);
  const intText = S.serializeDoc("interview", docs.interview, read("interview-data.js"));
  const ctx2 = {};
  ctx2.globalThis = ctx2;
  vm.runInNewContext(intText, ctx2);
  assert.equal(ctx2.InterviewData.QUESTIONS.length, docs.interview.QUESTIONS.length);
});

test("URLs must be http(s) — javascript:, data:, and relative links are rejected", () => {
  for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,<b>x</b>", "ftp://x.org", "/relative", "https://", "https://localhost"]) {
    const docs = liveDocs();
    docs.roadmap.resources[0].url = bad;
    const errs = S.validateDocs(docs);
    assert.ok(errs.some((e) => e.path === "resources.0.url"), `expected error for ${bad}`);
  }
  assert.ok(S.isHttpUrl("https://www.example.org/path?q=1"));
});

test("required fields, length limits, and fixed pathway length are enforced", () => {
  const docs = liveDocs();
  docs.roadmap.fields[0].name = "";
  docs.roadmap.fields[0].summary = "x".repeat(700);
  docs.roadmap.fields[1].pathway.pop();
  docs.roadmap.fields[2].pathway[0].title = "";
  const errs = S.validateDocs(docs);
  assert.ok(errs.some((e) => e.path === "fields.0.name" && /required/.test(e.message)));
  assert.ok(errs.some((e) => e.path === "fields.0.summary" && /too long/.test(e.message)));
  assert.ok(errs.some((e) => e.path === "fields.1.pathway" && /exactly 4/.test(e.message)));
  assert.ok(errs.some((e) => e.path === "fields.2.pathway.0.title" && /^Stage 1: /.test(e.message)));
});

test("duplicate IDs and duplicate names are rejected", () => {
  const docs = liveDocs();
  docs.roadmap.fields.push(clone(docs.roadmap.fields[0]));
  docs.roadmap.skills.push(clone(docs.roadmap.skills[0]));
  docs.interview.QUESTIONS.push(clone(docs.interview.QUESTIONS[0]));
  const errs = S.validateDocs(docs);
  assert.ok(errs.some((e) => e.collection === "fields" && /Duplicate/.test(e.message)));
  assert.ok(errs.some((e) => e.collection === "skills" && /Duplicate/.test(e.message)));
  assert.ok(errs.some((e) => e.collection === "questions" && /Duplicate/.test(e.message)));
});

test("broken relationships are caught: majors and jobs must point at existing fields", () => {
  const docs = liveDocs();
  docs.roadmap.majors[0].leadsToFields = ["no-such-field"];
  docs.jobs[0].fieldId = "no-such-field";
  docs.roadmap.majors[1].leadsToFields = [];
  const errs = S.validateDocs(docs);
  assert.ok(errs.some((e) => e.collection === "majors" && /doesn't exist/.test(e.message)));
  assert.ok(errs.some((e) => e.collection === "majors" && /at least 1/.test(e.message)));
  assert.ok(errs.some((e) => e.collection === "jobs" && /doesn't exist/.test(e.message)));
});

test("fieldReferences lists majors and jobs that still use a field", () => {
  const refs = S.fieldReferences("computer-science-software-engineering", liveDocs());
  assert.ok(refs.some((r) => r.collection === "majors"));
  assert.ok(refs.some((r) => r.collection === "jobs"));
  assert.deepEqual(S.fieldReferences("nope", liveDocs()), []);
});

test("real (non-sample) job listings require a source link", () => {
  const docs = liveDocs();
  docs.jobs[0].isSampleData = false;
  assert.ok(S.validateDocs(docs).some((e) => e.path === "jobs.0.sourceUrl"));
  docs.jobs[0].sourceUrl = "https://careers.example.org/job/123";
  assert.deepEqual(S.validateDocs(docs), []);
});

test("enums reject unsupported values", () => {
  const docs = liveDocs();
  docs.jobs[0].experienceLevel = "ceo";
  docs.interview.QUESTIONS[0].difficulty = "impossible";
  const errs = S.validateDocs(docs);
  assert.ok(errs.some((e) => e.path === "jobs.0.experienceLevel"));
  assert.ok(errs.some((e) => e.path === "questions.0.difficulty"));
});

test("sanitizing drops unknown keys (no mass assignment) and coerces types", () => {
  const item = S.sanitizeItem("jobs", {
    id: "job-1", title: "  T  ", company: "C", fieldId: "civil-engineering", experienceLevel: "new-grad",
    location: "L", remote: "true", description: "D", isSampleData: true, isAdmin: true, __proto__: { polluted: 1 }, extra: "x",
  });
  assert.equal(item.title, "T");
  assert.equal(item.remote, true);
  assert.equal("isAdmin" in item, false);
  assert.equal("extra" in item, false);
  assert.equal({}.polluted, undefined);
  const doc = S.sanitizeDoc("roadmap", { fields: [], majors: "nope", skills: null, resources: [{ title: "x", url: "https://a.org", injected: "<script>" }] });
  assert.deepEqual(doc.majors, []);
  assert.equal("injected" in doc.resources[0], false);
});

test("mergeManaged keeps developer-maintained interview sections from the live file", () => {
  const live = liveDocs().interview;
  const client = clone(live);
  client.TMAY = { hacked: true };
  client.STAR_EXAMPLE = "replaced";
  client.NEW_TOP_LEVEL = "x";
  client.CHECKLIST_AFTER = [...client.CHECKLIST_AFTER, "Send a thank-you note"];
  const merged = S.mergeManaged("interview", live, client);
  assert.deepEqual(merged.TMAY, live.TMAY);
  assert.deepEqual(merged.STAR_EXAMPLE, live.STAR_EXAMPLE);
  assert.equal("NEW_TOP_LEVEL" in merged, false);
  assert.equal(merged.CHECKLIST_AFTER.at(-1), "Send a thank-you note");
});

test("text is stored verbatim (escaping happens when rendering) and control chars are stripped", () => {
  const item = S.sanitizeItem("resources", { title: "<img src=x onerror=alert(1)>\u0007", url: "https://a.org", provider: "", description: "" });
  assert.equal(item.title, "<img src=x onerror=alert(1)>");
  const { esc } = require("../utils.js");
  assert.equal(esc(item.title), "&lt;img src=x onerror=alert(1)&gt;");
});

test("summarizeChanges reports added / edited / removed / reordered and ignores key order", () => {
  const before = liveDocs();
  const after = clone(before);
  after.roadmap.resources.push({ title: "New", url: "https://new.org", provider: "", description: "" });
  after.roadmap.skills[0].resources.push("Book");
  after.jobs.splice(1, 1);
  after.roadmap.fields.reverse();
  after.interview.CHECKLIST_DURING.push("Breathe");
  const reorderedKeys = Object.fromEntries(Object.entries(after.roadmap.majors[0]).reverse());
  after.roadmap.majors[0] = reorderedKeys;
  const c = S.summarizeChanges(before, after);
  const has = (col, type) => c.some((x) => x.collection === col && x.type === type);
  assert.ok(has("resources", "added"));
  assert.ok(has("skills", "edited"));
  assert.ok(has("jobs", "removed"));
  assert.ok(has("fields", "reordered"));
  assert.ok(has("guidance", "edited"));
  assert.equal(c.some((x) => x.collection === "majors"), false);
});

test("ID helpers generate safe, unique identifiers", () => {
  assert.equal(S.slugify("Materials Science & Engineering"), "materials-science-and-engineering");
  assert.equal(S.slugify("Café  Ops!!"), "cafe-ops");
  assert.equal(S.uniqueId("a", ["a", "a-2"]), "a-3");
  assert.equal(S.nextNumberedId("job", ["job-1", "job-12", "x"]), "job-13");
  assert.equal(S.COLLECTIONS.majors.makeId({ name: "Physics" }), "physics-major");
  assert.equal(S.COLLECTIONS.questions.makeId({ category: "technical", question: "What is a REST API and why use one?" }), "tech-what-is-a-rest-api-and");
});

test("every collection's newItem() becomes valid once its required fields are filled", () => {
  const docs = liveDocs();
  const fill = { name: "Test Name", summary: "S", title: "Title", company: "Co", url: "https://t.org", location: "Remote", description: "D", question: "Q?", subcategory: "General" };
  for (const [name, col] of Object.entries(S.COLLECTIONS)) {
    if (col.object) continue;
    const item = { ...col.newItem() };
    Object.keys(item).forEach((k) => { if (fill[k] !== undefined && item[k] === "") item[k] = fill[k]; });
    if (name === "fields") item.pathway.forEach((p) => { p.title = "T"; p.description = "D"; });
    if (name === "majors") item.leadsToFields = [docs.roadmap.fields[0].id];
    if (name === "jobs") item.fieldId = docs.roadmap.fields[0].id;
    if (col.idKey) item[col.idKey] = "new-test-item";
    const clean = S.sanitizeItem(name, item);
    const errs = S.validateItem(name, clean, S.buildContext(docs), 0);
    assert.deepEqual(errs, [], name);
  }
});
