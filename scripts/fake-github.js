// In-memory stand-in for the slice of the GitHub REST API the admin dashboard uses
// (refs, commits, contents, trees, commit statuses, commit listing). Used ONLY by
// local development and automated tests so publishing can be exercised end to end
// without touching the real repository. Not deployed (scripts/ isn't routed).

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function blobSha(text) {
  const buf = Buffer.from(text, "utf8");
  return crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}
const randSha = () => crypto.randomBytes(20).toString("hex");

function createFakeGithub({ root, files, branch = "master", deployDelayMs = 1500, token = "fake-token" }) {
  const commits = new Map(); // sha -> { sha, tree: {path: text}, treeSha, parents, message, author, date }
  const trees = new Map();   // treeSha -> {path: text}
  const refs = { [branch]: null };
  const statusOverride = new Map(); // sha -> "failure"
  const calls = [];
  const hooks = {}; // tests: hooks.beforeRefUpdate() simulates a concurrent publish
  let failAuth = false;

  const initialTree = {};
  files.forEach((p) => { initialTree[p] = fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n/g, "\n"); });
  const t0 = randSha();
  trees.set(t0, initialTree);
  const c0 = { sha: randSha(), tree: initialTree, treeSha: t0, parents: [], message: "Initial content", author: { name: "dev", email: "dev@example.test" }, date: new Date(Date.now() - 86400000).toISOString() };
  commits.set(c0.sha, c0);
  refs[branch] = c0.sha;

  function head() { return commits.get(refs[branch]); }

  function json(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }

  function resolveRef(ref) {
    if (!ref || ref === branch) return head();
    return commits.get(ref) || null;
  }

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
    const url = new URL(req.url, "http://fake");
    calls.push({ method: req.method, path: url.pathname });
    if (failAuth || req.headers.authorization !== `Bearer ${token}`) return json(res, 401, { message: "Bad credentials" });
    const m = /^\/repos\/[^/]+\/[^/]+(\/.*)$/.exec(url.pathname);
    if (!m) return json(res, 404, { message: "Not Found" });
    const p = m[1];
    let mm;

    if (req.method === "GET" && (mm = /^\/git\/ref\/heads\/(.+)$/.exec(p))) {
      if (decodeURIComponent(mm[1]) !== branch) return json(res, 404, { message: "Not Found" });
      return json(res, 200, { object: { sha: refs[branch] } });
    }
    if (req.method === "GET" && (mm = /^\/git\/commits\/([0-9a-f]{40})$/.exec(p))) {
      const c = commits.get(mm[1]);
      return c ? json(res, 200, { sha: c.sha, tree: { sha: c.treeSha } }) : json(res, 404, { message: "Not Found" });
    }
    if (req.method === "GET" && (mm = /^\/contents\/(.+)$/.exec(p))) {
      const c = resolveRef(url.searchParams.get("ref"));
      const filePath = decodeURIComponent(mm[1]);
      if (!c || c.tree[filePath] === undefined) return json(res, 404, { message: "Not Found" });
      const text = c.tree[filePath];
      return json(res, 200, { sha: blobSha(text), encoding: "base64", content: Buffer.from(text, "utf8").toString("base64") });
    }
    if (req.method === "POST" && p === "/git/trees") {
      const base = trees.get(body.base_tree);
      if (!base) return json(res, 422, { message: "base_tree not found" });
      const next = { ...base };
      body.tree.forEach((e) => { next[e.path] = e.content; });
      const sha = randSha();
      trees.set(sha, next);
      return json(res, 201, { sha });
    }
    if (req.method === "POST" && p === "/git/commits") {
      const tree = trees.get(body.tree);
      if (!tree) return json(res, 422, { message: "tree not found" });
      const c = { sha: randSha(), tree, treeSha: body.tree, parents: body.parents, message: body.message, author: body.author, date: new Date().toISOString() };
      commits.set(c.sha, c);
      return json(res, 201, { sha: c.sha });
    }
    if (req.method === "PATCH" && (mm = /^\/git\/refs\/heads\/(.+)$/.exec(p))) {
      const c = commits.get(body.sha);
      if (!c) return json(res, 422, { message: "Object does not exist" });
      if (hooks.beforeRefUpdate) { const h = hooks.beforeRefUpdate; delete hooks.beforeRefUpdate; h(); }
      if (!body.force && !c.parents.includes(refs[branch])) return json(res, 422, { message: "Update is not a fast forward" });
      refs[branch] = c.sha;
      return json(res, 200, { object: { sha: c.sha } });
    }
    if (req.method === "GET" && (mm = /^\/commits\/([0-9a-f]{40})\/status$/.exec(p))) {
      const c = commits.get(mm[1]);
      if (!c) return json(res, 404, { message: "Not Found" });
      const age = Date.now() - new Date(c.date).getTime();
      const state = statusOverride.get(c.sha) || (age < deployDelayMs ? "pending" : "success");
      return json(res, 200, { state, statuses: [{ context: "Vercel", state, target_url: "https://vercel.example/deploy", description: state }] });
    }
    if (req.method === "GET" && p === "/commits") {
      const filePath = url.searchParams.get("path");
      const out = [];
      let c = head();
      while (c) {
        const parent = c.parents[0] ? commits.get(c.parents[0]) : null;
        if (!filePath || !parent || parent.tree[filePath] !== c.tree[filePath]) {
          out.push({ sha: c.sha, commit: { message: c.message, author: { date: c.date }, committer: { date: c.date } } });
        }
        c = parent;
      }
      return json(res, 200, out.slice(0, Number(url.searchParams.get("per_page") || 30)));
    }
    return json(res, 404, { message: `Fake GitHub: unsupported ${req.method} ${p}` });
  });

  return {
    server,
    calls,
    hooks,
    setFailAuth: (v) => { failAuth = v; },
    commitCount: () => commits.size,
    head,
    headFile: (p) => head().tree[p],
    failDeploy: (sha) => statusOverride.set(sha, "failure"),
    // Simulates someone else committing directly (for conflict tests).
    externalCommit(filePath, text) {
      const h = head();
      const tree = { ...h.tree, [filePath]: text };
      const treeSha = randSha();
      trees.set(treeSha, tree);
      const c = { sha: randSha(), tree, treeSha, parents: [h.sha], message: "External edit", author: { name: "dev" }, date: new Date(Date.now() - deployDelayMs - 1).toISOString() };
      commits.set(c.sha, c);
      refs[branch] = c.sha;
      return c.sha;
    },
  };
}

module.exports = { createFakeGithub, blobSha };
