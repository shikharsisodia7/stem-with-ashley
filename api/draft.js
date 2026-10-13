// Save Draft (PUT) / Discard Draft (DELETE). Drafts live in the database, never
// on the public site, and survive refreshes, sign-outs, and other devices.
const Schema = require("../admin/cms-schema.js");
const { handler, send, readJson, query, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db, rateLimit } = require("./_lib/db");
const { formatErrors } = require("./_lib/content");

const SHA_RE = /^[0-9a-f]{40}$/;

module.exports = handler(["PUT", "DELETE"], async (req, res) => {
  const { token, email } = await requireUser(req);
  const database = db(token);

  if (req.method === "DELETE") {
    const doc = query(req).doc;
    if (!Schema.DOC_NAMES.includes(doc)) throw new HttpError(400, "Unknown content type.");
    const removed = await database.deleteDraft(doc);
    // Only log real discards (clearing an already-empty draft is a no-op).
    if (Array.isArray(removed) && removed.length) await database.audit("discard_draft", true, { doc });
    return send(res, 200, { ok: true, discarded: Array.isArray(removed) ? removed.length : 0 });
  }

  const body = await readJson(req);
  const { doc, content, baseSha } = body;
  if (!Schema.DOC_NAMES.includes(doc)) throw new HttpError(400, "Unknown content type.");
  if (typeof baseSha !== "string" || !SHA_RE.test(baseSha)) throw new HttpError(400, "Missing the version this draft was based on. Reload the page and try again.");
  if (content === undefined || content === null || typeof content !== "object") throw new HttpError(400, "The draft was empty.");
  await rateLimit(database, "save_draft", email, 600);

  // Drafts may be unfinished, so we store the sanitized shape and report problems
  // as warnings instead of refusing to save.
  const clean = Schema.sanitizeDoc(doc, content);
  const warnings = formatErrors(Schema.validateDocs({ [doc]: clean }));
  const rows = await database.upsertDraft({ doc, content: clean, base_sha: baseSha });
  const row = Array.isArray(rows) ? rows[0] : rows;
  await database.audit("save_draft", true, { doc });
  send(res, 200, {
    ok: true,
    draft: { content: row.content, baseSha: row.base_sha, updatedBy: row.updated_by, updatedAt: row.updated_at },
    warnings,
  });
});
