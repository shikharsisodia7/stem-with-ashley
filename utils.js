// Shared helpers used by app.js, interview.js, and worksheet.js.
// No framework, no build step — plain browser globals.

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

// Admin dashboard preview: when a page is opened inside the dashboard's preview
// frame (?cms-preview=1), it asks the dashboard (same origin only) for the draft
// content instead of loading the published files. Resolves null otherwise.
function receivePreviewData() {
  if (typeof window === "undefined" || window.parent === window) return Promise.resolve(null);
  if (!new URLSearchParams(window.location.search).has("cms-preview")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    window.addEventListener("message", function onMessage(e) {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (!e.data || e.data.type !== "cms-preview-data") return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      const banner = document.createElement("div");
      banner.className = "cms-preview-banner";
      banner.textContent = "Preview of unpublished changes — not visible to the public yet.";
      document.body.prepend(banner);
      resolve(e.data);
    });
    window.parent.postMessage({ type: "cms-preview-ready" }, window.location.origin);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { esc, safeGetJSON, safeSetJSON, receivePreviewData };
}
