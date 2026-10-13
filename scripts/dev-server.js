// Local development / test server: serves the static site and runs the /api/*
// functions exactly as Vercel would (same handler files, plain Node req/res).
//
//   node scripts/dev-server.js                 # uses real env vars (GitHub + Supabase)
//   CMS_FAKE_GITHUB=1 node scripts/dev-server.js
//      -> publishes go to an in-memory fake GitHub, and this server acts as the
//         "live website" (content files are served from the fake repo's latest
//         commit), so the whole Edit -> Publish -> Live loop runs locally.
//
// Reads KEY=VALUE lines from .env.local (gitignored) if present.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) return;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".mp4": "video/mp4", ".md": "text/markdown; charset=utf-8", ".ico": "image/x-icon",
};

async function start(opts) {
  const options = opts || {};
  loadEnvFile(path.join(ROOT, options.envFile || ".env.local"));
  const port = Number(options.port || process.env.PORT || 4321);
  let fake = null;
  const Schema = require("../admin/cms-schema.js");
  const contentPaths = new Set(Object.values(Schema.DOCS).map((d) => d.path));

  if (options.fakeGithub || process.env.CMS_FAKE_GITHUB === "1") {
    const { createFakeGithub } = require("./fake-github.js");
    fake = createFakeGithub({ root: ROOT, files: [...contentPaths], deployDelayMs: Number(process.env.CMS_FAKE_DEPLOY_MS || 1500) });
    await new Promise((r) => fake.server.listen(0, "127.0.0.1", r));
    process.env.GITHUB_API_URL = `http://127.0.0.1:${fake.server.address().port}`;
    process.env.GITHUB_TOKEN = "fake-token";
    process.env.PUBLIC_SITE_URL = `http://127.0.0.1:${port}`;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    const apiMatch = /^\/api\/([a-z-]+)\/?$/.exec(pathname);
    if (apiMatch) {
      const file = path.join(ROOT, "api", `${apiMatch[1]}.js`);
      if (!fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
      try {
        return await require(file)(req, res);
      } catch (e) {
        console.error(e);
        res.writeHead(500);
        return res.end("dev server error");
      }
    }

    if (pathname.endsWith("/")) pathname += "index.html";
    const rel = pathname.replace(/^\/+/, "");
    if (rel.split("/").some((seg) => seg.startsWith(".")) || rel.startsWith("api/") || rel.startsWith("scripts/")) {
      res.writeHead(404);
      return res.end("Not found");
    }
    // In fake mode, the content files come from the fake repo's latest commit,
    // so a publish shows up on this "live site" just like a Vercel deploy would.
    if (fake && contentPaths.has(rel)) {
      res.writeHead(200, { "Content-Type": MIME[path.extname(rel)] || "text/plain", "Cache-Control": "no-store" });
      return res.end(fake.headFile(rel));
    }
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise((r) => server.listen(port, options.host || "127.0.0.1", r));
  const address = `http://127.0.0.1:${server.address().port}`;
  if (fake) process.env.PUBLIC_SITE_URL = address;
  return { server, fake, url: address, close: () => { server.close(); if (fake) fake.server.close(); } };
}

if (require.main === module) {
  start().then(({ url, fake }) => {
    console.log(`STEM with Ashley dev server: ${url}  (admin: ${url}/admin/)${fake ? "  [fake GitHub]" : ""}`);
  });
}

module.exports = { start, loadEnvFile };
