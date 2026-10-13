// Publish: validates every saved draft together, then writes all changed files to
// GitHub in ONE commit (so the site is never half-updated). Vercel deploys that
// commit automatically; the dashboard then polls /api/status until the new
// content is confirmed on the live website.
//
// POST { dryRun?: boolean, overwrite?: string[] }
//   dryRun    -> only report what would change (used by the Preview screen)
//   overwrite -> docs whose drafts should replace a newer live version (only after
//                the user explicitly confirmed it in the conflict dialog)

const Schema = require("../admin/cms-schema.js");
const { handler, send, readJson, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db, rateLimit } = require("./_lib/db");
const github = require("./_lib/github");
const { loadLive, dataOf, formatErrors, commitMessage, DASHBOARD_AUTHOR } = require("./_lib/content");

module.exports = handler(["POST"], async (req, res) => {
  const { token, email } = await requireUser(req);
  const body = await readJson(req);
  const dryRun = body.dryRun === true;
  const overwrite = Array.isArray(body.overwrite) ? body.overwrite.filter((d) => Schema.DOC_NAMES.includes(d)) : [];
  const database = db(token);

  const drafts = (await database.listDrafts()) || [];
  if (!drafts.length) return send(res, 200, { ok: true, nothingToPublish: true, changes: [] });

  const gh = github.client();
  if (!dryRun) await rateLimit(database, "publish", email, 30);
  const live = await loadLive(gh);
  const liveData = dataOf(live);

  // Conflicts: the live file changed since this draft was started.
  const conflicts = drafts
    .filter((d) => d.base_sha !== live.docs[d.doc].sha && !overwrite.includes(d.doc))
    .map((d) => ({ doc: d.doc, label: Schema.DOCS[d.doc].label, draftUpdatedBy: d.updated_by, draftUpdatedAt: d.updated_at }));

  const next = { ...liveData };
  drafts.forEach((d) => { next[d.doc] = Schema.mergeManaged(d.doc, liveData[d.doc], d.content); });

  const errors = formatErrors(Schema.validateDocs(next));
  const changes = Schema.summarizeChanges(liveData, next);
  const changedDocs = Schema.DOC_NAMES.filter((n) => Schema.stable(next[n]) !== Schema.stable(liveData[n]));

  if (dryRun) {
    return send(res, 200, { ok: errors.length === 0 && conflicts.length === 0, dryRun: true, changes, errors, conflicts, changedDocs });
  }
  if (conflicts.length) {
    await database.audit("publish", false, { reason: "conflict", conflicts });
    throw new HttpError(409, "The live website changed after you started editing. Choose whether to keep your version or start over from the live version.", { code: "conflict", conflicts });
  }
  if (errors.length) {
    await database.audit("publish", false, { reason: "validation", errors: errors.slice(0, 10) });
    throw new HttpError(422, "Some content needs fixing before it can be published.", { code: "invalid", errors });
  }
  if (!changedDocs.length) {
    await Promise.all(drafts.map((d) => database.deleteDraft(d.doc, d.updated_at)));
    return send(res, 200, { ok: true, nothingToPublish: true, changes: [] });
  }

  const files = changedDocs.map((n) => ({
    path: Schema.DOCS[n].path,
    text: Schema.serializeDoc(n, next[n], live.docs[n].text),
  }));
  let commitSha;
  try {
    commitSha = await gh.commitFiles({
      parentSha: live.headSha,
      files,
      message: commitMessage("Content update", changes),
      author: DASHBOARD_AUTHOR,
    });
  } catch (e) {
    await database.audit("publish", false, { reason: e.code || e.message, status: e.status || null });
    throw e;
  }

  const removed = changes.filter((c) => c.type === "removed");
  await database.insertPublication({ kind: "publish", commit_sha: commitSha, docs: changedDocs, summary: { changes: changes.slice(0, 200) } });
  await database.audit("publish", true, { commitSha, docs: changedDocs, changeCount: changes.length, removed });
  // Clear only drafts that weren't edited again while we were publishing.
  await Promise.all(drafts.map((d) => database.deleteDraft(d.doc, d.updated_at)));

  send(res, 200, {
    ok: true,
    commitSha,
    changedDocs,
    changes,
    files: files.map((f) => ({ path: f.path, sha: github.gitBlobSha(f.text) })),
  });
});
