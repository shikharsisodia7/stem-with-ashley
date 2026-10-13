// Loads everything the dashboard edits: the live (published) version of each
// content document plus any saved, unpublished drafts.
const { handler, send } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db } = require("./_lib/db");
const { config } = require("./_lib/config");
const github = require("./_lib/github");
const { loadLive } = require("./_lib/content");
const { loadFromSite } = require("./_lib/site");

module.exports = handler(["GET"], async (req, res) => {
  const { token } = await requireUser(req);
  const cfg = config();
  const database = db(token);
  const [live, drafts] = await Promise.all([
    cfg.githubToken ? loadLive(github.client()) : loadFromSite(),
    database.listDrafts(),
  ]);
  const out = {};
  Object.entries(live.docs).forEach(([name, d]) => {
    const draft = (drafts || []).find((r) => r.doc === name);
    out[name] = {
      path: d.path,
      liveSha: d.sha,
      live: d.data,
      draft: draft ? { content: draft.content, baseSha: draft.base_sha, updatedBy: draft.updated_by, updatedAt: draft.updated_at } : null,
    };
  });
  send(res, 200, { headSha: live.headSha, publishing: Boolean(cfg.githubToken), docs: out });
});
