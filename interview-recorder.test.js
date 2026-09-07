// Node has no navigator/MediaRecorder, so these tests exercise exactly the
// feature-detection and error-handling paths that matter for graceful
// degradation in real unsupported/blocked browsers.
const test = require("node:test");
const assert = require("node:assert/strict");
const InterviewRecorder = require("./interview-recorder.js");

test("isRecordingSupported is false without navigator.mediaDevices/MediaRecorder (Node/old browsers)", () => {
  assert.equal(InterviewRecorder.isRecordingSupported(), false);
});

test("pickMimeType returns an empty string when MediaRecorder is unavailable", () => {
  assert.equal(InterviewRecorder.pickMimeType(), "");
});

test("formatElapsed formats seconds as mm:ss", () => {
  assert.equal(InterviewRecorder.formatElapsed(0), "00:00");
  assert.equal(InterviewRecorder.formatElapsed(5), "00:05");
  assert.equal(InterviewRecorder.formatElapsed(65), "01:05");
  assert.equal(InterviewRecorder.formatElapsed(3661), "61:01");
});

test("formatElapsed handles negative/undefined input without crashing", () => {
  assert.equal(InterviewRecorder.formatElapsed(-5), "00:00");
  assert.equal(InterviewRecorder.formatElapsed(undefined), "00:00");
  assert.equal(InterviewRecorder.formatElapsed(NaN), "00:00");
});

test("mapGetUserMediaError maps known DOMException names to friendly codes", () => {
  assert.equal(InterviewRecorder.mapGetUserMediaError({ name: "NotAllowedError" }), "permission-denied");
  assert.equal(InterviewRecorder.mapGetUserMediaError({ name: "NotFoundError" }), "no-device");
  assert.equal(InterviewRecorder.mapGetUserMediaError({ name: "NotReadableError" }), "device-in-use");
  assert.equal(InterviewRecorder.mapGetUserMediaError({ name: "OverconstrainedError" }), "overconstrained");
  assert.equal(InterviewRecorder.mapGetUserMediaError({ name: "SecurityError" }), "insecure-context");
  assert.equal(InterviewRecorder.mapGetUserMediaError({ name: "SomethingElse" }), "unknown");
  assert.equal(InterviewRecorder.mapGetUserMediaError(null), "unknown");
});

test("messageForError returns a student-friendly message for every known code, never raw error text", () => {
  const codes = ["unsupported", "permission-denied", "no-device", "device-in-use", "overconstrained", "insecure-context", "recorder-init-failed", "recorder-start-failed", "recorder-error", "unknown", "totally-made-up-code"];
  codes.forEach((code) => {
    const msg = InterviewRecorder.messageForError(code);
    assert.ok(typeof msg === "string" && msg.length > 0, `no message for code "${code}"`);
    assert.doesNotMatch(msg, /Error:|at Object|stack/i, `message for "${code}" looks like a raw error/stack trace`);
  });
});

test("createVideoPracticeController.start() reports 'unsupported' and never touches media APIs when unsupported", async () => {
  const errors = [];
  const states = [];
  const controller = InterviewRecorder.createVideoPracticeController({
    onError: (code) => errors.push(code),
    onStateChange: (state) => states.push(state),
  });
  const result = await controller.start();
  assert.equal(result, null);
  assert.deepEqual(errors, ["unsupported"]);
  assert.deepEqual(states, []);
  assert.deepEqual(controller.getState(), { state: "idle", elapsedSeconds: 0, recordedUrl: null });
});

test("controller.stop()/discard()/cleanup() are no-ops from idle state and never throw", () => {
  const controller = InterviewRecorder.createVideoPracticeController({});
  assert.doesNotThrow(() => controller.stop());
  assert.doesNotThrow(() => controller.discard());
  assert.doesNotThrow(() => controller.cleanup());
  assert.equal(controller.getStream(), null);
});
