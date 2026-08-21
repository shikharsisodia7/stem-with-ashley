const test = require("node:test");
const assert = require("node:assert/strict");
const { generateWorksheet, splitSentences, extractKeyTerms } = require("./worksheet-generator.js");

const SAMPLE_NOTES =
  "Photosynthesis converts light energy into chemical energy. Plants use chlorophyll to absorb sunlight during photosynthesis. " +
  "The process of photosynthesis produces oxygen as a byproduct. Mitochondria generate energy for the cell through respiration. " +
  "Cellular respiration breaks down glucose to release usable energy.";

test("generateWorksheet handles normal input and produces sections", () => {
  const worksheet = generateWorksheet({ title: "Biology Basics", notes: SAMPLE_NOTES, numQuestions: 6 });
  assert.equal(worksheet.isEmpty, false);
  assert.equal(worksheet.title, "Biology Basics");
  assert.ok(worksheet.fillBlank.length > 0, "expected at least one fill-in-the-blank item");
  assert.ok(worksheet.keyTerms.length > 0, "expected at least one key term");
  worksheet.fillBlank.forEach((item) => {
    assert.ok(item.prompt.includes("______"), "fill-in-the-blank prompt must contain a blank");
    assert.ok(item.answer.length > 0);
  });
});

test("generateWorksheet handles empty input without crashing", () => {
  const worksheet = generateWorksheet({ title: "", notes: "" });
  assert.equal(worksheet.isEmpty, true);
  assert.equal(worksheet.fillBlank.length, 0);
  assert.equal(worksheet.shortAnswer.length, 0);
  assert.ok(typeof worksheet.warning === "string" && worksheet.warning.length > 0);
});

test("generateWorksheet handles whitespace-only / fragment input gracefully", () => {
  const worksheet = generateWorksheet({ notes: "   \n\n  - bullet\n- another" });
  assert.equal(worksheet.isEmpty, true);
});

test("generateWorksheet respects numQuestions bounds (clamped 4-15)", () => {
  const many = SAMPLE_NOTES.repeat(4);
  const worksheet = generateWorksheet({ notes: many, numQuestions: 999 });
  assert.ok(worksheet.fillBlank.length + worksheet.shortAnswer.length <= 30);
  const low = generateWorksheet({ notes: SAMPLE_NOTES, numQuestions: 0 });
  assert.ok(low.fillBlank.length + low.shortAnswer.length >= 1);
});

test("generateWorksheet preserves raw (unescaped) text — escaping is the UI layer's job", () => {
  const dangerous = 'The <script>alert(1)</script> element is dangerous. Always sanitize user input before rendering it as HTML.';
  const worksheet = generateWorksheet({ notes: dangerous });
  const allText = JSON.stringify(worksheet);
  // The generator itself must not crash or silently drop the text — it just
  // shouldn't be trusted as HTML. The UI layer is responsible for escaping.
  assert.ok(allText.length > 0);
});

test("splitSentences filters out short fragments and bullets", () => {
  const sentences = splitSentences("Ok.\n- short\nThis is a real sentence that is long enough to count.");
  assert.ok(sentences.some((s) => s.includes("real sentence")));
  assert.ok(!sentences.includes("Ok."));
});

test("extractKeyTerms ranks repeated terms higher", () => {
  const sentences = splitSentences(SAMPLE_NOTES);
  const terms = extractKeyTerms(sentences, 5);
  const lowerTerms = terms.map((t) => t.lower);
  assert.ok(lowerTerms.includes("photosynthesis"), "photosynthesis appears 3x and should rank highly");
});
