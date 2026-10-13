// Restore an earlier version: re-publishes the content files exactly as they were
// at an earlier commit, as a NEW commit (history is never rewritten, so a restore
// can itself be undone).
// POST { sha, discardDrafts?: boolean }
const Schema = require("../admin/cms-schema.js");
const { handler, send, readJson, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db, rateLimit } = require("./_lib/db");
const github = require("./_lib/github");
const { loadLive, dataOf, formatErrors, commitMessage } = require("./_lib/content");

module.exports = handler(["POST"], async (req, res) => {
  const { token, email } = await requireUser(req);
  const body = await readJson(req);
  if (!/^[0-9a-f]{40}$/.test(body.sha || "")) throw new HttpError(400, "Choose a version to restore.");
  const database = db(token);
  const drafts = (await database.listDrafts()) || [];
  if (drafts.length && body.discardDrafts !== true) {
    throw new HttpError(409, "You have unpublished drafts. Restoring will throw them away, so please confirm first.", { code: "has_drafts" });
  }
  await rateLimit(database, "publish", email, 30);

  const gh = github.client();
  const live = await loadLive(gh);
  const liveData = dataOf(live);
  const next = { ...liveData };
  const skipped = [];
  await Promise.all(Schema.DOC_NAMES.map(async (name) => {
    const f = await gh.getFile(Schema.DOCS[name].path, body.sha);
    if (!f) { skipped.push(name); return; }
    try {
      // Only dashboard-managed parts are restored; developer-maintained parts stay current.
      next[name] = Schema.mergeManaged(name, liveData[name], Schema.parseDoc(name, f.text));
    } catch (e) {
      skipped.push(name); // that version predates the dashboard's file format
    }
  }));

  const errors = formatErrors(Schema.validateDocs(next));
  if (errors.length) {
    await database.audit("restore", false, { sha: body.sha, reason: "validation" });
    throw new HttpError(422, "That older version doesn't pass today's content checks, so it can't be restored automatically. Ask Shikhar for help.", { code: "invalid", errors });
  }
  const changedDocs = Schema.DOC_NAMES.filter((n) => Schema.stable(next[n]) !== Schema.stable(liveData[n]));
  if (!changedDocs.length) {
    if (drafts.length) await database.deleteAllDrafts();
    return send(res, 200, { ok: true, nothingToPublish: true, skipped });
  }
  const changes = Schema.summarizeChanges(liveData, next);
  const files = changedDocs.map((n) => ({ path: Schema.DOCS[n].path, text: Schema.serializeDoc(n, next[n], live.docs[n].text) }));
  let commitSha;
  try {
    commitSha = await gh.commitFiles({
      parentSha: live.headSha,
      files,
      message: commitMessage(`Restore content from ${body.sha.slice(0, 7)}`, changes, email),
      author: email ? { name: `${email} (Admin Dashboard)`, email } : undefined,
    });
  } catch (e) {
    await database.audit("restore", false, { sha: body.sha, reason: e.code || e.message });
    throw e;
  }
  if (drafts.length) await database.deleteAllDrafts();
  await database.insertPublication({ kind: "restore", commit_sha: commitSha, docs: changedDocs, restored_from: body.sha, summary: { changes: changes.slice(0, 200) } });
  await database.audit("restore", true, { commitSha, restoredFrom: body.sha, docs: changedDocs, discardedDrafts: drafts.map((d) => d.doc) });
  send(res, 200, {
    ok: true, commitSha, changedDocs, changes, skipped,
    files: files.map((f) => ({ path: f.path, sha: github.gitBlobSha(f.text) })),
  });
});
