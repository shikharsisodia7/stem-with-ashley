// Version history: recent content versions on the live branch (from GitHub, so
// developer edits show up too), who published each one from the dashboard, and
// the dashboard's audit trail (including failures and deletions).
const Schema = require("../admin/cms-schema.js");
const { handler, send } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db } = require("./_lib/db");
const github = require("./_lib/github");

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
        publishedBy: p ? p.published_by : "Developer (GitHub)",
        changes: p && p.summary && p.summary.changes ? p.summary.changes.slice(0, 30) : null,
        restoredFrom: p ? p.restored_from : null,
      };
    });
  send(res, 200, {
    versions,
    audit: (audit || []).filter((a) => a.action !== "save_draft").slice(0, 40),
  });
});
