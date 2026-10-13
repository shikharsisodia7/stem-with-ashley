// Loads the live content documents from GitHub and turns edited documents into
// repo files. Shared by content/publish/restore/status endpoints.

const Schema = require("../../admin/cms-schema.js");
const { HttpError } = require("./http");

// -> { headSha, docs: { roadmap: { path, text, sha, data }, ... } }
async function loadLive(gh, ref) {
  const headSha = ref || (await gh.headSha());
  const docs = {};
  await Promise.all(Schema.DOC_NAMES.map(async (name) => {
    const meta = Schema.DOCS[name];
    const f = await gh.getFile(meta.path, headSha);
    if (!f) throw new HttpError(500, `The live site is missing ${meta.path}.`);
    let data;
    try {
      data = Schema.parseDoc(name, f.text);
    } catch (e) {
      throw new HttpError(500, `The live file ${meta.path} couldn't be read (${e.message}). A developer needs to fix it.`);
    }
    docs[name] = { path: meta.path, text: f.text, sha: f.sha, data };
  }));
  return { headSha, docs };
}

function dataOf(live) {
  return Object.fromEntries(Object.entries(live.docs).map(([k, v]) => [k, v.data]));
}

function formatErrors(errors) {
  return errors.slice(0, 50).map((e) => ({
    collection: e.collection || null,
    index: e.index === undefined ? null : e.index,
    item: e.item || null,
    path: e.path || null,
    message: e.message,
  }));
}

// The repository is public, so commits never carry the editor's name or email; the
// private cms_publications table records who published each version.
const DASHBOARD_AUTHOR = { name: "STEM with Ashley Admin Dashboard", email: "admin-dashboard@stem-with-ashley.invalid" };

function commitMessage(prefix, changes) {
  const counts = {};
  changes.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
  const parts = Object.entries(counts).map(([t, n]) => `${n} ${t}`);
  const lines = changes.slice(0, 40).map((c) => `- ${c.type}: ${c.collection} / ${c.title}`);
  return `${prefix}: ${parts.join(", ") || "content update"}\n\n${lines.join("\n")}${changes.length > 40 ? `\n- …and ${changes.length - 40} more` : ""}\n\nPublished from the admin dashboard.`;
}

module.exports = { loadLive, dataOf, formatErrors, commitMessage, DASHBOARD_AUTHOR };
