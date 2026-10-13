// Database access through Supabase's REST API using the SIGNED-IN USER's token, so
// row-level security applies to every query (defense in depth on top of the role
// check in auth.js). No service-role key is used for content data.

const { HttpError } = require("./http");
const { config } = require("./config");

function db(token) {
  const cfg = config();
  const base = `${cfg.supabaseUrl}/rest/v1`;
  const headers = {
    apikey: cfg.supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function call(method, path, body, extraHeaders) {
    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: { ...headers, ...(extraHeaders || {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new HttpError(503, "Couldn't reach the dashboard database. Please try again in a minute.");
    }
    const text = await res.text();
    if (!res.ok) {
      console.error("[admin-db]", method, path, res.status, text.slice(0, 300));
      throw new HttpError(res.status === 401 ? 401 : 503, res.status === 401
        ? "Your session has expired. Please sign in again."
        : "The dashboard database had a problem. Please try again in a minute.");
    }
    return text ? JSON.parse(text) : null;
  }

  return {
    listDrafts: () => call("GET", "/cms_drafts?select=doc,content,base_sha,updated_by,updated_at"),
    upsertDraft: (row) => call("POST", "/cms_drafts?on_conflict=doc", row, {
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    deleteDraft: (doc, updatedAt) => call(
      "DELETE",
      `/cms_drafts?doc=eq.${encodeURIComponent(doc)}${updatedAt ? `&updated_at=eq.${encodeURIComponent(updatedAt)}` : ""}`,
      undefined,
      { Prefer: "return=representation" }
    ),
    deleteAllDrafts: () => call("DELETE", "/cms_drafts?doc=neq.__none__", undefined, { Prefer: "return=minimal" }),
    insertPublication: (row) => call("POST", "/cms_publications", row, { Prefer: "return=representation" }),
    listPublications: (limit) => call("GET", `/cms_publications?select=*&order=created_at.desc&limit=${limit || 30}`),
    audit: (action, ok, details) => call("POST", "/cms_audit", { action, ok, details: details || {} }, { Prefer: "return=minimal" })
      .catch((e) => console.error("[admin-audit] failed to record", action, e.message)),
    listAudit: (limit) => call("GET", `/cms_audit?select=*&order=created_at.desc&limit=${limit || 50}`),
    // Counts this user's recent actions (rows are stamped with their email by a DB trigger).
    countRecent: async (action, email, sinceIso) => {
      const rows = await call(
        "GET",
        `/cms_audit?select=id&action=eq.${encodeURIComponent(action)}&actor=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(sinceIso)}`
      );
      return Array.isArray(rows) ? rows.length : 0;
    },
  };
}

// Simple per-user rate limit backed by the audit log.
async function rateLimit(database, action, email, maxPerHour) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const n = await database.countRecent(action, email, since);
  if (n >= maxPerHour) {
    throw new HttpError(429, "That's a lot of changes in a short time — please wait a few minutes and try again.");
  }
}

module.exports = { db, rateLimit };
