// Publication status: is the published commit actually live on the website yet?
// GET ?sha=<commit>&files=<path>:<blobSha>,<path>:<blobSha>
//   queued    -> GitHub has the commit; Vercel hasn't started deploying it yet
//   deploying -> Vercel is building/deploying it
//   verifying -> Vercel says done; waiting for the live files to match
//   live      -> every published file on the live website matches the commit
//   failed    -> Vercel reported a failed deployment (the old version stays live)
const Schema = require("../admin/cms-schema.js");
const { handler, send, query, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const github = require("./_lib/github");
const { fetchLiveFile } = require("./_lib/site");

const SHA_RE = /^[0-9a-f]{40}$/;
const PATHS = new Set(Object.values(Schema.DOCS).map((d) => d.path));

module.exports = handler(["GET"], async (req, res) => {
  await requireUser(req);
  const q = query(req);
  if (!SHA_RE.test(q.sha || "")) throw new HttpError(400, "Missing publication id.");
  const files = String(q.files || "").split(",").filter(Boolean).map((pair) => {
    const i = pair.lastIndexOf(":");
    return { path: pair.slice(0, i), sha: pair.slice(i + 1) };
  });
  if (!files.length || files.some((f) => !PATHS.has(f.path) || !SHA_RE.test(f.sha))) throw new HttpError(400, "Invalid file list.");

  const gh = github.client();
  const deploy = await gh.deployStatus(q.sha);
  if (deploy && (deploy.state === "failure" || deploy.state === "error")) {
    return send(res, 200, { state: "failed", detail: deploy.description || "The website build failed.", deployUrl: deploy.url });
  }
  const checks = await Promise.all(files.map(async (f) => {
    const liveFile = await fetchLiveFile(f.path).catch(() => null);
    return { path: f.path, live: Boolean(liveFile && liveFile.sha === f.sha) };
  }));
  if (checks.every((c) => c.live)) return send(res, 200, { state: "live", deployUrl: deploy && deploy.url, files: checks });
  if (!deploy) return send(res, 200, { state: "queued", files: checks });
  if (deploy.state === "pending") return send(res, 200, { state: "deploying", deployUrl: deploy.url, files: checks });
  return send(res, 200, { state: "verifying", deployUrl: deploy.url, files: checks });
});
