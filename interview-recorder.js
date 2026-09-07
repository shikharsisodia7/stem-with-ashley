// Browser-native video practice recorder. Uses getUserMedia + MediaRecorder only —
// no upload, no third-party service, no server storage. The recorded video exists
// only as an in-memory Blob/object URL for the current browser tab and is revoked
// (freed) on discard, re-record, or navigating away from the Video Practice step.
//
// Split into: pure/guardable helpers (isRecordingSupported, formatElapsed,
// mapGetUserMediaError, pickMimeType) that are safe to run in Node for unit tests,
// and createVideoPracticeController(), which touches real browser media APIs and
// is exercised via mocks in the browser only.

(function (global) {
  function isRecordingSupported() {
    return (
      typeof navigator !== "undefined" &&
      !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") &&
      typeof window !== "undefined" &&
      typeof window.MediaRecorder === "function"
    );
  }

  function formatElapsed(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function pickMimeType() {
    if (typeof window === "undefined" || typeof window.MediaRecorder !== "function") return "";
    if (typeof window.MediaRecorder.isTypeSupported !== "function") return "";
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    return candidates.find((t) => window.MediaRecorder.isTypeSupported(t)) || "";
  }

  function mapGetUserMediaError(err) {
    const name = err && err.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") return "permission-denied";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") return "no-device";
    if (name === "NotReadableError" || name === "TrackStartError") return "device-in-use";
    if (name === "OverconstrainedError") return "overconstrained";
    if (name === "SecurityError") return "insecure-context";
    return "unknown";
  }

  const ERROR_MESSAGES = {
    unsupported: "Video practice isn't supported in this browser. Every other part of the guide still works without it.",
    "permission-denied": "Camera/microphone access was denied. Allow access in your browser's site settings and try again, or skip video practice.",
    "no-device": "No camera or microphone was found on this device.",
    "device-in-use": "Your camera or microphone appears to be in use by another app. Close other apps using them and try again.",
    overconstrained: "Your camera doesn't support the requested video settings.",
    "insecure-context": "Video practice requires a secure (https) connection.",
    "recorder-init-failed": "Recording isn't supported in this browser.",
    "recorder-start-failed": "Recording failed to start. Please try again.",
    "recorder-error": "Something went wrong while recording. Please try again.",
    unknown: "Something went wrong accessing your camera or microphone.",
  };

  function messageForError(code) {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES.unknown;
  }

  // state machine: idle -> requesting -> recording -> preview -> idle (discard/re-record)
  function createVideoPracticeController(handlers) {
    const { onStateChange, onError, onTick } = handlers || {};
    let stream = null;
    let recorder = null;
    let chunks = [];
    let recordedUrl = null;
    let timerId = null;
    let elapsedSeconds = 0;
    let state = "idle";

    function setState(next) {
      state = next;
      if (typeof onStateChange === "function") onStateChange(state);
    }

    function stopTracks() {
      if (stream) {
        stream.getTracks().forEach((t) => {
          try { t.stop(); } catch (e) { /* already stopped */ }
        });
        stream = null;
      }
    }

    function clearTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function revokeUrl() {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        recordedUrl = null;
      }
    }

    async function start() {
      if (!isRecordingSupported()) {
        if (onError) onError("unsupported");
        return null;
      }
      if (state === "requesting" || state === "recording") return null;

      revokeUrl();
      chunks = [];
      elapsedSeconds = 0;
      setState("requesting");

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        setState("idle");
        if (onError) onError(mapGetUserMediaError(err));
        return null;
      }

      try {
        const mimeType = pickMimeType();
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (err) {
        stopTracks();
        setState("idle");
        if (onError) onError("recorder-init-failed");
        return null;
      }

      recorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      });
      recorder.addEventListener("stop", () => {
        clearTimer();
        stopTracks();
        const blob = new Blob(chunks, { type: (recorder && recorder.mimeType) || "video/webm" });
        recordedUrl = URL.createObjectURL(blob);
        setState("preview");
      });
      recorder.addEventListener("error", () => {
        clearTimer();
        stopTracks();
        setState("idle");
        if (onError) onError("recorder-error");
      });
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (state === "recording") stop();
        });
      });

      try {
        recorder.start();
      } catch (err) {
        stopTracks();
        setState("idle");
        if (onError) onError("recorder-start-failed");
        return null;
      }

      setState("recording");
      timerId = setInterval(() => {
        elapsedSeconds += 1;
        if (onTick) onTick(elapsedSeconds);
      }, 1000);

      return stream;
    }

    function stop() {
      if (recorder && state === "recording") {
        try { recorder.stop(); } catch (e) { /* already stopped */ }
      }
    }

    function discard() {
      clearTimer();
      stopTracks();
      revokeUrl();
      chunks = [];
      elapsedSeconds = 0;
      setState("idle");
    }

    function cleanup() {
      discard();
    }

    function getState() {
      return { state, elapsedSeconds, recordedUrl };
    }

    function getStream() {
      return stream;
    }

    return { start, stop, discard, cleanup, getState, getStream };
  }

  const api = {
    isRecordingSupported,
    formatElapsed,
    pickMimeType,
    mapGetUserMediaError,
    messageForError,
    createVideoPracticeController,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.InterviewRecorder = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
