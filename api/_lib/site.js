// Reads content files straight from the live public website. Used (1) to confirm a
// publish is really live, by comparing git blob hashes, and (2) as a read-only
// fallback for loading content before GitHub publishing access is configured.

const Schema = require("../../admin/cms-schema.js");
const { config } = require("./config");
const { gitBlobSha } = require("./github");

async function fetchLiveFile(path) {
  const cfg = config();
  const res = await fetch(`${cfg.siteUrl}/${path}?cms-check=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache", "User-Agent": "stem-with-ashley-admin" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const text = await res.text();
  return { text, sha: gitBlobSha(text) };
}

async function loadFromSite() {
  const docs = {};
  await Promise.all(Schema.DOC_NAMES.map(async (name) => {
    const meta = Schema.DOCS[name];
    const f = await fetchLiveFile(meta.path);
    if (!f) throw new Error(`could not fetch ${meta.path} from the live site`);
    docs[name] = { path: meta.path, text: f.text, sha: f.sha, data: Schema.parseDoc(name, f.text) };
  }));
  return { headSha: null, docs };
}

module.exports = { fetchLiveFile, loadFromSite };
