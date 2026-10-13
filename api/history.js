// Version history: recent content versions on the live branch (from GitHub, so
// developer edits show up too), who published each one from the dashboard, and
// the dashboard's audit trail (including failures and deletions).
const Schema = require("../admin/cms-schema.js");
const { handler, send } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db } = require("./_lib/db");
const github = require("./_lib/github");

// Rows in cms_publications / cms_audit can be inserted by any signed-in editor
// (row-level security allows it so the server can log with the user's own token),
// so treat them as untrusted: keep only known shapes and plain strings.
const CHANGE_TYPES = new Set(["added", "edited", "removed", "reordered"]);
const str = (v, max) => (typeof v === "string" ? v.slice(0, max || 200) : v === null || v === undefined ? "" : String(v).slice(0, max || 200));
function cleanChanges(list) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 30).map((c) => ({
    type: CHANGE_TYPES.has(c && c.type) ? c.type : "edited",
    collection: str(c && c.collection, 40),
    title: str(c && c.title, 120),
  }));
}
function cleanAudit(a) {
  const d = a && a.details && typeof a.details === "object" ? a.details : {};
  return {
    created_at: str(a.created_at, 40),
    actor: str(a.actor, 200),
    action: str(a.action, 40),
    ok: a.ok === true,
    details: {
      ...(Array.isArray(d.removed) ? { removed: d.removed.slice(0, 20).map((r) => ({ title: str(r && r.title, 120) })) } : {}),
      ...(d.email ? { email: str(d.email, 200) } : {}),
    },
  };
}

module.exports = handler(["GET"], async (req, res) => {
  const { token } = await requireUser(req);
  const database = db(token);
  const gh = github.client();
  const [pubs, audit, ...perPath] = await Promise.all([
    database.listPublications(50),
    database.listAudit(80),
    ...Object.values(Schema.DOCS).map((d) => gh.commitsForPath(d.path, 25)),
  ]);
  const byPub = new Map((pubs || []).map((p) => [p.commit_sha, p]));
  const seen = new Map();
  perPath.forEach((commits, i) => {
    const docName = Schema.DOC_NAMES[i];
    (commits || []).forEach((c) => {
      const entry = seen.get(c.sha) || {
        sha: c.sha,
        date: (c.commit.committer && c.commit.committer.date) || (c.commit.author && c.commit.author.date),
        message: String(c.commit.message || "").split("\n")[0].slice(0, 200),
        docs: [],
      };
      entry.docs.push(docName);
      seen.set(c.sha, entry);
    });
  });
  const versions = [...seen.values()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 40)
    .map((v, i) => {
      const p = byPub.get(v.sha);
      return {
        ...v,
        current: i === 0,
        source: p ? "dashboard" : "developer",
        kind: p ? p.kind : "developer",
        publishedBy: p ? str(p.published_by, 200) : "Developer (GitHub)",
        changes: p && p.summary ? cleanChanges(p.summary.changes) : null,
        restoredFrom: p && /^[0-9a-f]{40}$/.test(p.restored_from || "") ? p.restored_from : null,
      };
    });
  send(res, 200, {
    versions,
    audit: (audit || []).filter((a) => a.action !== "save_draft").slice(0, 40).map(cleanAudit),
  });
});
