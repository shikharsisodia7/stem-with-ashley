// API tests for the admin dashboard backend. The real /api/* handlers run inside
// the local dev server, talking to IN-MEMORY FAKES of GitHub (scripts/fake-github.js)
// and Supabase (tests/fakes/fake-supabase.js). Nothing here touches the real
// repository or database — see tests/e2e for the browser tests against real Supabase.
// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const S = require("../admin/cms-schema.js");
const { createFakeSupabase } = require("./fakes/fake-supabase.js");
const { start } = require("../scripts/dev-server.js");

const ROOT = path.join(__dirname, "..");
let srv;
let sb;
let admin;
let editor;
let norole;

test.before(async () => {
  sb = createFakeSupabase();
  await new Promise((r) => sb.server.listen(0, "127.0.0.1", r));
  process.env.SUPABASE_URL = `http://127.0.0.1:${sb.server.address().port}`;
  process.env.SUPABASE_ANON_KEY = sb.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = sb.serviceKey;
  process.env.CRON_SECRET = "cron-secret";
  process.env.CMS_FAKE_DEPLOY_MS = "300";
  srv = await start({ port: 0, fakeGithub: true, envFile: "__none__" });
  admin = sb.addUser("ashley@example.test", "admin");
  editor = sb.addUser("editor@example.test", "editor");
  norole = sb.addUser("stranger@example.test", null);
});

test.after(() => {
  srv.close();
  sb.server.close();
});

async function call(p, { method = "GET", body, token = admin.token, raw } = {}) {
  const res = await fetch(`${srv.url}/api/${p}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
    body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { status: res.status, data };
}

async function content(token) {
  return (await call("content", { token })).data;
}

async function resetDrafts() {
  sb.tables.cms_drafts.length = 0;
}

async function saveDraft(doc, mutate, token) {
  const c = await content(token);
  const d = c.docs[doc];
  const working = JSON.parse(JSON.stringify(d.draft ? d.draft.content : d.live));
  mutate(working);
  return call("draft", { method: "PUT", body: { doc, content: working, baseSha: d.draft ? d.draft.baseSha : d.liveSha }, token });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Authentication & authorization ----------

const PROTECTED = [
  ["me", "GET"], ["content", "GET"], ["draft", "PUT"], ["draft?doc=roadmap", "DELETE"], ["publish", "POST"],
  ["status?sha=0000000000000000000000000000000000000000&files=x", "GET"], ["history", "GET"], ["restore", "POST"], ["team", "GET"], ["team", "POST"],
];

test("every protected endpoint rejects anonymous requests with 401", async () => {
  for (const [p, method] of PROTECTED) {
    const r = await call(p, { method, token: null, body: method === "GET" || method === "DELETE" ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${p}`);
  }
});

test("invalid or expired tokens are rejected with 401", async () => {
  for (const [p, method] of PROTECTED) {
    const r = await call(p, { method, token: "tok-forged", body: method === "GET" || method === "DELETE" ? undefined : {} });
    assert.equal(r.status, 401, `${method} ${p}`);
  }
});

test("signed-in accounts without a dashboard role get 403 everywhere", async () => {
  for (const [p, method] of PROTECTED) {
    const r = await call(p, { method, token: norole.token, body: method === "GET" || method === "DELETE" ? undefined : {} });
    assert.equal(r.status, 403, `${method} ${p}`);
  }
});

test("editors can edit content but not manage the team", async () => {
  assert.equal((await call("content", { token: editor.token })).status, 200);
  assert.equal((await call("team", { token: editor.token })).status, 403);
  assert.equal((await call("team", { method: "POST", token: editor.token, body: { action: "invite", email: "x@y.org", role: "admin" } })).status, 403);
});

test("wrong HTTP methods get 405", async () => {
  assert.equal((await call("publish", { method: "GET" })).status, 405);
  assert.equal((await call("content", { method: "POST", body: {} })).status, 405);
});

test("/api/config exposes only public settings", async () => {
  const r = await call("config", { token: null });
  assert.equal(r.status, 200);
  const text = JSON.stringify(r.data);
  assert.ok(!text.includes(sb.serviceKey));
  assert.ok(!text.includes("fake-token"));
  assert.deepEqual(Object.keys(r.data).sort(), ["siteUrl", "supabaseAnonKey", "supabaseUrl"]);
});

test("keepalive cron requires the cron secret", async () => {
  assert.equal((await call("keepalive", { token: null })).status, 401);
  const res = await fetch(`${srv.url}/api/keepalive`, { headers: { Authorization: "Bearer cron-secret" } });
  assert.equal(res.status, 200);
});

// ---------- Drafts ----------

test("drafts persist on the server and survive a fresh load (e.g. after sign-out)", async () => {
  await resetDrafts();
  const r = await saveDraft("roadmap", (w) => { w.skills[0].resources.push("Draft-only book"); });
  assert.equal(r.status, 200);
  const again = await content(editor.token); // another session, other user
  assert.ok(again.docs.roadmap.draft);
  assert.ok(again.docs.roadmap.draft.content.skills[0].resources.includes("Draft-only book"));
  assert.ok(!again.docs.roadmap.live.skills[0].resources.includes("Draft-only book"), "live content must not change");
  assert.equal(srv.fake.headFile("data/roadmap-data.json").includes("Draft-only book"), false);
  assert.equal((await call("draft?doc=roadmap", { method: "DELETE" })).status, 200);
  assert.equal((await content()).docs.roadmap.draft, null);
});

test("discarding an empty draft is a no-op and isn't logged", async () => {
  await resetDrafts();
  const count = () => sb.tables.cms_audit.filter((a) => a.action === "discard_draft").length;
  const before = count();
  const r = await call("draft?doc=jobs", { method: "DELETE" });
  assert.equal(r.data.discarded, 0);
  assert.equal(count(), before);
  await saveDraft("jobs", (w) => { w[0].description += " x"; });
  const r2 = await call("draft?doc=jobs", { method: "DELETE" });
  assert.equal(r2.data.discarded, 1);
  assert.equal(count(), before + 1);
});

test("drafts may be unfinished: saved with warnings instead of refused", async () => {
  await resetDrafts();
  const r = await saveDraft("roadmap", (w) => { w.resources[0].url = "not a url"; });
  assert.equal(r.status, 200);
  assert.ok(r.data.warnings.some((w) => w.path === "resources.0.url"));
  await resetDrafts();
});

test("draft requests are validated (unknown doc, missing base version, bad JSON, oversized)", async () => {
  const c = await content();
  assert.equal((await call("draft", { method: "PUT", body: { doc: "secrets", content: {}, baseSha: c.docs.roadmap.liveSha } })).status, 400);
  assert.equal((await call("draft", { method: "PUT", body: { doc: "roadmap", content: {}, baseSha: "abc" } })).status, 400);
  assert.equal((await call("draft", { method: "PUT", raw: "{not json" })).status, 400);
  const huge = "x".repeat(2.2 * 1024 * 1024);
  assert.equal((await call("draft", { method: "PUT", raw: JSON.stringify({ doc: "roadmap", content: { pad: huge }, baseSha: c.docs.roadmap.liveSha }) })).status, 413);
});

test("drafts strip unknown keys before storage (no mass assignment)", async () => {
  await resetDrafts();
  await saveDraft("jobs", (w) => { w[0].isAdmin = true; w[0].__debug = "x"; });
  const stored = sb.tables.cms_drafts.find((d) => d.doc === "jobs").content;
  assert.equal("isAdmin" in stored[0], false);
  assert.equal("__debug" in stored[0], false);
  await resetDrafts();
});

// ---------- Publishing ----------

test("dry run reports changes without committing anything", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.resources.push({ title: "Dry Run Resource", url: "https://dry.example.org", provider: "", description: "" }); });
  const commitsBefore = srv.fake.commitCount();
  const r = await call("publish", { method: "POST", body: { dryRun: true } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.changes, [{ collection: "resources", type: "added", title: "Dry Run Resource" }]);
  assert.equal(srv.fake.commitCount(), commitsBefore);
  await resetDrafts();
});

test("invalid content is never published (422, no commit, draft kept)", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.resources[0].url = "javascript:alert(document.cookie)"; });
  const before = srv.fake.commitCount();
  const r = await call("publish", { method: "POST", body: {} });
  assert.equal(r.status, 422);
  assert.equal(r.data.code, "invalid");
  assert.ok(r.data.errors.some((e) => e.path === "resources.0.url"));
  assert.equal(srv.fake.commitCount(), before);
  assert.equal(sb.tables.cms_drafts.length, 1);
  assert.ok(sb.tables.cms_audit.some((a) => a.action === "publish" && a.ok === false));
  await resetDrafts();
});

test("publishing several documents makes ONE atomic commit and clears the drafts", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[1].resources.push("Atomic Skill Book"); });
  await saveDraft("jobs", (w) => { w.push({ id: "job-50", title: "Atomic Job", company: "Real Co", fieldId: "civil-engineering", experienceLevel: "new-grad", location: "Remote", remote: true, description: "D", isSampleData: false, sourceUrl: "https://jobs.example.org/50", lastVerified: "2026-10-12" }); });
  await saveDraft("interview", (w) => { w.CHECKLIST_AFTER.push("Atomic checklist item"); });
  const before = srv.fake.commitCount();
  const r = await call("publish", { method: "POST", body: {} });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(srv.fake.commitCount(), before + 1, "exactly one commit");
  assert.deepEqual(r.data.changedDocs.sort(), ["interview", "jobs", "roadmap"]);
  assert.ok(srv.fake.headFile("data/roadmap-data.json").includes("Atomic Skill Book"));
  assert.ok(srv.fake.headFile("jobs/jobs-data.js").includes("Atomic Job"));
  assert.ok(srv.fake.headFile("interview-data.js").includes("Atomic checklist item"));
  assert.equal(sb.tables.cms_drafts.length, 0);
  const pub = sb.tables.cms_publications.at(-1);
  assert.equal(pub.commit_sha, r.data.commitSha);
  assert.equal(pub.published_by, "ashley@example.test");
  // The repo is public: the commit must not reveal who published (that stays private).
  const head = srv.fake.head();
  assert.ok(!JSON.stringify(head.author).includes("ashley@example.test"), "author must not contain the editor email");
  assert.ok(!head.message.includes("ashley@example.test"), "message must not contain the editor email");
});

test("published JS files still run in the browser and keep developer-maintained sections", async () => {
  const vm = require("node:vm");
  const ctx = {};
  ctx.globalThis = ctx;
  vm.runInNewContext(srv.fake.headFile("interview-data.js"), ctx);
  const local = S.parseDoc("interview", fs.readFileSync(path.join(ROOT, "interview-data.js"), "utf8"));
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.InterviewData.TMAY)), local.TMAY);
  const ctx2 = {};
  vm.runInNewContext(`${srv.fake.headFile("jobs/jobs-data.js")}\nthis.j = SAMPLE_JOBS;`, ctx2);
  assert.ok(ctx2.j.some((j) => j.title === "Atomic Job"));
});

test("status goes from deploying to live only once the live site serves the published files", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[2].resources.push("Status Book"); });
  const r = await call("publish", { method: "POST", body: {} });
  const files = r.data.files.map((f) => `${f.path}:${f.sha}`).join(",");
  // In fake mode the dev server IS the live site, so the files match immediately; the
  // fake Vercel status is "pending" for 300 ms. Live wins as soon as the bytes match.
  const s1 = await call(`status?sha=${r.data.commitSha}&files=${encodeURIComponent(files)}`);
  assert.equal(s1.status, 200);
  assert.ok(["deploying", "live"].includes(s1.data.state));
  // A mismatching file hash must never report "live".
  const wrong = r.data.files.map((f) => `${f.path}:${"0".repeat(40)}`).join(",");
  const s2 = await call(`status?sha=${r.data.commitSha}&files=${encodeURIComponent(wrong)}`);
  assert.notEqual(s2.data.state, "live");
  await sleep(350);
  const s3 = await call(`status?sha=${r.data.commitSha}&files=${encodeURIComponent(files)}`);
  assert.equal(s3.data.state, "live");
});

test("a failed deployment is reported as failed", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[3].resources.push("Fail Book"); });
  const r = await call("publish", { method: "POST", body: {} });
  srv.fake.failDeploy(r.data.commitSha);
  const files = r.data.files.map((f) => `${f.path}:${f.sha}`).join(",");
  const s = await call(`status?sha=${r.data.commitSha}&files=${encodeURIComponent(files)}`);
  assert.equal(s.data.state, "failed");
});

test("status rejects malformed input", async () => {
  assert.equal((await call("status?sha=xyz&files=a:b")).status, 400);
  assert.equal((await call(`status?sha=${"a".repeat(40)}&files=${encodeURIComponent(`/etc/passwd:${"a".repeat(40)}`)}`)).status, 400);
});

test("conflict: if the live file changed after the draft started, publish stops (409) until the user chooses", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[4].resources.push("Conflicting Book"); });
  // Someone else (e.g. a developer) updates the same file directly.
  const live = S.parseDoc("roadmap", srv.fake.headFile("data/roadmap-data.json"));
  live.resources[0].provider = "Changed by developer";
  srv.fake.externalCommit("data/roadmap-data.json", S.serializeDoc("roadmap", live));
  const before = srv.fake.commitCount();
  const r = await call("publish", { method: "POST", body: {} });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "conflict");
  assert.equal(r.data.conflicts[0].doc, "roadmap");
  assert.equal(srv.fake.commitCount(), before);
  // The user explicitly chooses "Keep my version".
  const r2 = await call("publish", { method: "POST", body: { overwrite: ["roadmap"] } });
  assert.equal(r2.status, 200);
  assert.ok(srv.fake.headFile("data/roadmap-data.json").includes("Conflicting Book"));
});

test("race: if the branch moves during publish, nothing is half-published (409)", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[5].resources.push("Race Book"); });
  srv.fake.hooks.beforeRefUpdate = () => {
    srv.fake.externalCommit("README.md", "concurrent change");
  };
  const r = await call("publish", { method: "POST", body: {} });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "head_moved");
  assert.equal(srv.fake.headFile("data/roadmap-data.json").includes("Race Book"), false);
  assert.equal(sb.tables.cms_drafts.length, 1, "draft kept for retry");
  const retry = await call("publish", { method: "POST", body: {} });
  assert.equal(retry.status, 200);
});

test("GitHub credential problems give a friendly 503 and keep drafts", async () => {
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[6].resources.push("Auth Fail Book"); });
  srv.fake.setFailAuth(true);
  try {
    const r = await call("publish", { method: "POST", body: {} });
    assert.equal(r.status, 503);
    assert.match(r.data.error, /drafts are safe/);
  } finally {
    srv.fake.setFailAuth(false);
  }
  assert.equal(sb.tables.cms_drafts.length, 1);
  await resetDrafts();
});

test("publishing with no drafts or no real differences is a no-op", async () => {
  await resetDrafts();
  assert.equal((await call("publish", { method: "POST", body: {} })).data.nothingToPublish, true);
  await saveDraft("roadmap", () => {});
  const before = srv.fake.commitCount();
  const r = await call("publish", { method: "POST", body: {} });
  assert.equal(r.data.nothingToPublish, true);
  assert.equal(srv.fake.commitCount(), before);
  assert.equal(sb.tables.cms_drafts.length, 0);
});

// ---------- History & restore ----------

test("history lists versions with who published them, plus the audit trail", async () => {
  const r = await call("history");
  assert.equal(r.status, 200);
  assert.ok(r.data.versions.length >= 3);
  assert.equal(r.data.versions[0].current, true);
  assert.ok(r.data.versions.some((v) => v.publishedBy === "ashley@example.test" && v.changes));
  assert.ok(r.data.versions.some((v) => v.source === "developer"));
  assert.ok(r.data.audit.some((a) => a.action === "publish" && a.ok === false));
});

test("history neutralizes forged log rows (an editor can write those tables directly)", async () => {
  const head = srv.fake.head().sha;
  const payload = '"><img src=x onerror=alert(document.cookie)>';
  sb.tables.cms_publications.push({
    id: 9999, kind: "publish", commit_sha: head, docs: ["roadmap"], published_by: "editor@example.test",
    summary: { changes: [{ type: payload, collection: payload, title: payload, extra: "x" }] }, restored_from: payload,
    created_at: new Date().toISOString(),
  });
  sb.tables.cms_audit.push({ id: 9999, action: payload, ok: "yes", actor: "editor@example.test", details: { removed: [{ title: payload }], secret: "x" }, created_at: new Date().toISOString() });
  const r = await call("history");
  const v = r.data.versions.find((x) => x.sha === head);
  assert.equal(v.changes[0].type, "edited", "unknown change types are coerced");
  assert.deepEqual(Object.keys(v.changes[0]).sort(), ["collection", "title", "type"]);
  assert.equal(v.restoredFrom, null);
  const a = r.data.audit.find((x) => x.action.startsWith('"'));
  assert.equal(a.ok, false);
  assert.equal("secret" in a.details, false);
  sb.tables.cms_publications.pop();
  sb.tables.cms_audit.pop();
});

test("public renderers only link to http(s) URLs", () => {
  const { safeHttpUrl } = require("../utils.js");
  assert.equal(safeHttpUrl("https://ok.org/x"), "https://ok.org/x");
  assert.equal(safeHttpUrl(" javascript:alert(1)"), "#");
  assert.equal(safeHttpUrl("data:text/html,x"), "#");
  assert.equal(safeHttpUrl(undefined), "#");
});

test("restore requires confirmation when drafts exist, then republishes the old content as a new commit", async () => {
  const h = (await call("history")).data;
  const target = h.versions.find((v) => /Initial/.test(v.message));
  await resetDrafts();
  await saveDraft("roadmap", (w) => { w.skills[7].resources.push("Pending draft"); });
  const blocked = await call("restore", { method: "POST", body: { sha: target.sha } });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.data.code, "has_drafts");
  const before = srv.fake.commitCount();
  const r = await call("restore", { method: "POST", body: { sha: target.sha, discardDrafts: true } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(srv.fake.commitCount(), before + 1);
  assert.equal(srv.fake.headFile("data/roadmap-data.json").includes("Atomic Skill Book"), false);
  assert.equal(srv.fake.headFile("jobs/jobs-data.js").includes("Atomic Job"), false);
  assert.equal(sb.tables.cms_drafts.length, 0);
  assert.equal(sb.tables.cms_publications.at(-1).kind, "restore");
  assert.equal((await call("restore", { method: "POST", body: { sha: "nope" } })).status, 400);
});

// ---------- Team management ----------

test("admins can invite people, get one-time setup links, and change roles", async () => {
  const list = await call("team");
  assert.equal(list.status, 200);
  assert.ok(list.data.users.some((u) => u.email === "ashley@example.test" && u.role === "admin"));

  const inv = await call("team", { method: "POST", body: { action: "invite", email: "New.Person@Example.test", role: "editor" } });
  assert.equal(inv.status, 200);
  assert.equal(inv.data.linkType, "invite");
  assert.match(inv.data.link, /\/admin\/\?setup=[0-9a-f]+&type=invite$/);
  const created = [...sb.users.values()].find((u) => u.email === "new.person@example.test");
  assert.equal(created.app_metadata.cms_role, "editor");

  const link = await call("team", { method: "POST", body: { action: "link", email: "editor@example.test" } });
  assert.equal(link.data.linkType, "recovery");

  assert.equal((await call("team", { method: "POST", body: { action: "link", email: "nobody@example.test" } })).status, 404);
  assert.equal((await call("team", { method: "POST", body: { action: "invite", email: "not-an-email", role: "editor" } })).status, 400);
  assert.equal((await call("team", { method: "POST", body: { action: "invite", email: "a@b.org", role: "superuser" } })).status, 400);

  const demote = await call("team", { method: "POST", body: { action: "setRole", userId: created.id, role: "none" } });
  assert.equal(demote.status, 200);
  assert.equal((await call("team", { method: "POST", body: { action: "setRole", userId: admin.user.id, role: "editor" } })).status, 400, "can't demote yourself");
});

test("an account whose access was removed is locked out immediately", async () => {
  const temp = sb.addUser("temp@example.test", "editor");
  assert.equal((await call("content", { token: temp.token })).status, 200);
  await call("team", { method: "POST", body: { action: "setRole", userId: temp.user.id, role: "none" } });
  assert.equal((await call("content", { token: temp.token })).status, 403);
});

// ---------- Secrets ----------

test("no secrets are committed to the repository", () => {
  let files;
  try {
    files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  } catch (e) {
    return; // not a git checkout (e.g. a zip) — nothing to scan
  }
  const patterns = [
    /ghp_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{40,}/, /gho_[A-Za-z0-9]{30,}/, /sb_secret_[A-Za-z0-9_-]{10,}/,
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]*InJvbGUiOiJzZXJ2aWNlX3JvbGUi/, // service_role JWT
    /VERCEL_OIDC_TOKEN=ey/, /E2E_[A-Z_]*PASSWORD=\S/,
  ];
  const offenders = [];
  files.forEach((f) => {
    if (/\.(mp4|pptx|docx|jpe?g|png)$/i.test(f) || f.startsWith("tests/e2e/node_modules") || f === "tests/api.test.js") return;
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full) || fs.statSync(full).size > 5 * 1024 * 1024) return;
    const text = fs.readFileSync(full, "utf8");
    patterns.forEach((re) => { if (re.test(text)) offenders.push(`${f} matches ${re}`); });
  });
  assert.deepEqual(offenders, []);
  assert.ok(!files.includes(".env.local"), ".env.local must stay untracked");
});

test("server code never sends secrets to the browser bundle", () => {
  const clientFiles = ["admin/admin.js", "admin/admin-forms.js", "admin/cms-schema.js", "admin/index.html"];
  clientFiles.forEach((f) => {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(!/GITHUB_TOKEN|SERVICE_ROLE|CRON_SECRET/.test(text), f);
  });
});
