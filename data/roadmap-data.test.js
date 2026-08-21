// Structural validation for roadmap-data.json — catches malformed content edits
// (missing fields, bad certification URLs, broken major->field links) before they
// ever reach the live site. Run with: node --test data/roadmap-data.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DATA_PATH = path.join(__dirname, "roadmap-data.json");
const raw = fs.readFileSync(DATA_PATH, "utf8");

test("roadmap-data.json parses as valid JSON", () => {
  assert.doesNotThrow(() => JSON.parse(raw));
});

const data = JSON.parse(raw);

test("top-level shape has fields, skills, majors, resources arrays", () => {
  assert.ok(Array.isArray(data.fields));
  assert.ok(Array.isArray(data.skills));
  assert.ok(Array.isArray(data.majors));
  assert.ok(Array.isArray(data.resources));
});

test("Materials Science field exists and is complete", () => {
  const field = data.fields.find((f) => f.id === "materials-science-engineering");
  assert.ok(field, "materials-science-engineering field is missing");
  assert.match(field.name, /Materials Science/);
  assert.equal(field.pathway.length, 4);
  assert.ok(field.certifications.length >= 5);
});

test("Project Management field exists and is complete", () => {
  const field = data.fields.find((f) => f.id === "project-management");
  assert.ok(field, "project-management field is missing");
  assert.equal(field.pathway.length, 4);
  assert.ok(field.certifications.length >= 5);
});

test("Project Management is reachable from more than one major (cross-cutting)", () => {
  const majorsLeadingToPM = data.majors.filter((m) => m.leadsToFields.includes("project-management"));
  assert.ok(majorsLeadingToPM.length >= 3, "expected Project Management to be linked from several majors, not just one");
});

const REQUIRED_FIELD_PROPS = [
  "id", "name", "summary", "pathway", "companies", "certifications", "mastersPrograms", "conferences", "organizations",
];

test("every field has all required properties with sane values", () => {
  data.fields.forEach((field) => {
    REQUIRED_FIELD_PROPS.forEach((prop) => {
      assert.ok(prop in field, `field "${field.id}" is missing "${prop}"`);
    });
    assert.equal(field.pathway.length, 4, `field "${field.id}" should have exactly 4 pathway steps`);
    field.pathway.forEach((step) => {
      assert.ok(step.title && step.yearRange && step.description, `field "${field.id}" has an incomplete pathway step`);
    });
  });
});

test("field ids are unique", () => {
  const ids = data.fields.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("major ids are unique", () => {
  const ids = data.majors.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every certification has a name, provider, and a validly formatted https URL", () => {
  data.fields.forEach((field) => {
    field.certifications.forEach((cert) => {
      assert.ok(cert.name && cert.name.trim(), `field "${field.id}" has a certification with no name`);
      assert.ok(cert.provider && cert.provider.trim(), `certification "${cert.name}" in "${field.id}" has no provider`);
      assert.ok(cert.url, `certification "${cert.name}" in "${field.id}" has no url`);
      assert.match(cert.url, /^https:\/\/.+/, `certification "${cert.name}" in "${field.id}" has a malformed url: ${cert.url}`);
      assert.doesNotThrow(() => new URL(cert.url), `certification "${cert.name}" in "${field.id}" has an unparsable url`);
    });
  });
});

test("every major's leadsToFields entries point at a real field id", () => {
  const fieldIds = new Set(data.fields.map((f) => f.id));
  data.majors.forEach((major) => {
    assert.ok(Array.isArray(major.leadsToFields) && major.leadsToFields.length > 0, `major "${major.id}" has no leadsToFields`);
    major.leadsToFields.forEach((fieldId) => {
      assert.ok(fieldIds.has(fieldId), `major "${major.id}" links to unknown field id "${fieldId}"`);
    });
  });
});

test("every resource has a title, url, provider, and description", () => {
  data.resources.forEach((r) => {
    assert.ok(r.title && r.url && r.provider && r.description, "resource missing a required property");
    assert.match(r.url, /^https:\/\/.+/, `resource "${r.title}" has a malformed url`);
  });
});

test("every skill has a name and at least one resource", () => {
  data.skills.forEach((s) => {
    assert.ok(s.name, "skill missing a name");
    assert.ok(Array.isArray(s.resources) && s.resources.length > 0, `skill "${s.name}" has no resources`);
  });
});

test("media entries (when present) are youtube or podcast with a valid url", () => {
  data.fields.forEach((field) => {
    (field.media || []).forEach((m) => {
      assert.ok(["youtube", "podcast"].includes(m.type), `field "${field.id}" has a media entry with an unexpected type: ${m.type}`);
      assert.match(m.url, /^https:\/\/.+/, `field "${field.id}" media entry "${m.title}" has a malformed url`);
    });
  });
});
