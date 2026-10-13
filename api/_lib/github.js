// Minimal GitHub REST client for publishing content as ONE atomic commit.
// Uses the Git Data API (tree -> commit -> ref update). The final ref update is a
// non-forced fast-forward, so if anything else landed on the branch in between,
// GitHub rejects it and nothing is half-published.

const crypto = require("node:crypto");
const { HttpError } = require("./http");
const { config } = require("./config");

// Same hash git uses for file contents — lets us compare a file served by the live
// website against exactly what we committed.
function gitBlobSha(text) {
  const buf = Buffer.from(text, "utf8");
  return crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

function client() {
  const cfg = config();
  if (!cfg.githubToken) {
    throw new HttpError(503, "Publishing isn't connected yet on the server (missing GitHub access). Your drafts are safe — ask Shikhar to finish setup.");
  }
  const [owner, repo] = cfg.githubRepo.split("/");
  const base = `${cfg.githubApiUrl}/repos/${owner}/${repo}`;
  const branch = cfg.githubBranch;

  async function call(method, path, body) {
    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${cfg.githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "stem-with-ashley-admin",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new HttpError(503, "Couldn't reach GitHub to publish. Please try again in a few minutes.");
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new HttpError(
        res.status === 401 || res.status === 403 ? 503 : 502,
        res.status === 401 || res.status === 403
          ? "The website's publishing access has expired or was removed. Your drafts are safe — ask Shikhar to renew the GitHub access token."
          : "GitHub had a problem handling the publish. Please try again in a few minutes."
      );
      err.githubStatus = res.status;
      err.githubMessage = data && data.message;
      throw err;
    }
    return data;
  }

  return {
    branch,
    async headSha() {
      const ref = await call("GET", `/git/ref/heads/${encodeURIComponent(branch)}`);
      return ref.object.sha;
    },
    // Returns { text, sha } (sha = git blob sha) for a file at a commit/branch.
    async getFile(path, ref) {
      try {
        const f = await call("GET", `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref || branch)}`);
        let text;
        if (f.content && f.encoding === "base64") text = Buffer.from(f.content, "base64").toString("utf8");
        else {
          const blob = await call("GET", `/git/blobs/${f.sha}`);
          text = Buffer.from(blob.content, "base64").toString("utf8");
        }
        return { text, sha: f.sha };
      } catch (e) {
        if (e.githubStatus === 404) return null;
        throw e;
      }
    },
    // files: [{ path, text }] -> new commit sha on the branch, or throws 409 on conflict.
    async commitFiles({ parentSha, files, message, author }) {
      const parent = await call("GET", `/git/commits/${parentSha}`);
      const tree = await call("POST", "/git/trees", {
        base_tree: parent.tree.sha,
        tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.text })),
      });
      const commit = await call("POST", "/git/commits", {
        message,
        tree: tree.sha,
        parents: [parentSha],
        ...(author ? { author } : {}),
      });
      try {
        await call("PATCH", `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha, force: false });
      } catch (e) {
        if (e.githubStatus === 422 || e.githubStatus === 409) {
          throw new HttpError(409, "Someone else published a change at the same moment. Reload to see the latest version, then publish again.", { code: "head_moved" });
        }
        throw e;
      }
      return commit.sha;
    },
    // Vercel reports each deployment back to GitHub as a commit status named "Vercel".
    async deployStatus(sha) {
      const s = await call("GET", `/commits/${sha}/status`);
      const v = (s.statuses || []).find((x) => /^vercel/i.test(x.context));
      return v ? { state: v.state, url: v.target_url || null, description: v.description || "" } : null;
    },
    async commitsForPath(path, perPage) {
      return call("GET", `/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${perPage || 20}`);
    },
  };
}

module.exports = { client, gitBlobSha };
