// One-step secret setup (Windows). Copy a secret, then run:
//   node scripts/setup-secret.js GITHUB_TOKEN
//   node scripts/setup-secret.js SUPABASE_SERVICE_ROLE_KEY
//   node scripts/setup-secret.js SUPABASE_ACCESS_TOKEN      (local only; lets tooling apply Supabase Auth settings)
// The value is read from the clipboard, checked against the real service, saved to
// the gitignored .env.local and (except SUPABASE_ACCESS_TOKEN) to Vercel Production,
// then the clipboard is cleared. The secret is never printed.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const REPO = "shikharsisodia7/stem-with-ashley";
const SUPABASE_REF = "uoitamnbnpsehxfdqvrl";

const CHECKS = {
  async GITHUB_TOKEN(v) {
    if (!/^github_pat_[A-Za-z0-9_]{40,}$/.test(v)) return "That doesn't look like a fine-grained GitHub token (starts with github_pat_).";
    const h = { Authorization: `Bearer ${v}`, Accept: "application/vnd.github+json", "User-Agent": "stem-setup" };
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/README.md`, { headers: h });
    if (!r.ok) return `GitHub rejected the token for ${REPO} (HTTP ${r.status}). Check "Only select repositories → stem-with-ashley" and Contents permission.`;
    const s = await fetch(`https://api.github.com/repos/${REPO}/commits/master/status`, { headers: h });
    if (!s.ok) return `The token can't read commit statuses (HTTP ${s.status}). Add "Commit statuses: Read-only".`;
    return null;
  },
  async SUPABASE_SERVICE_ROLE_KEY(v) {
    if (!/^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_secret_[\w-]+)$/.test(v)) return "That doesn't look like the service_role key (a long eyJ… value or sb_secret_…).";
    if (v.startsWith("eyJ")) {
      const payload = JSON.parse(Buffer.from(v.split(".")[1], "base64url").toString("utf8"));
      if (payload.role !== "service_role") return `That key's role is "${payload.role}", not service_role (you probably copied the anon key).`;
    }
    const r = await fetch(`https://${SUPABASE_REF}.supabase.co/auth/v1/admin/users?page=1&per_page=1`, { headers: { apikey: v, Authorization: `Bearer ${v}` } });
    return r.ok ? null : `Supabase rejected the key (HTTP ${r.status}).`;
  },
  async SUPABASE_ACCESS_TOKEN(v) {
    if (!/^sbp_[A-Za-z0-9]{20,}$/.test(v)) return "That doesn't look like a Supabase access token (starts with sbp_).";
    const r = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/config/auth`, { headers: { Authorization: `Bearer ${v}` } });
    return r.ok ? null : `Supabase rejected the access token (HTTP ${r.status}).`;
  },
};
const LOCAL_ONLY = new Set(["SUPABASE_ACCESS_TOKEN"]);

function ps(command) {
  return execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8" });
}

function saveLocal(name, value) {
  let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  text = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, "")}\n${line}\n`;
  fs.writeFileSync(ENV_FILE, text);
}

function saveVercel(name, value) {
  try {
    execFileSync("vercel", ["env", "rm", name, "production", "--yes"], { cwd: ROOT, stdio: "ignore", shell: true });
  } catch (e) { /* not set yet */ }
  execFileSync("vercel", ["env", "add", name, "production"], { cwd: ROOT, input: value, stdio: ["pipe", "ignore", "pipe"], shell: true });
}

module.exports = { CHECKS, LOCAL_ONLY, saveLocal, saveVercel, ps };

if (require.main === module) (async () => {
  const name = process.argv[2];
  if (!CHECKS[name]) {
    console.error(`Usage: node scripts/setup-secret.js ${Object.keys(CHECKS).join("|")}`);
    process.exit(2);
  }
  const value = ps("Get-Clipboard -Raw").trim();
  if (!value) { console.error("The clipboard is empty — copy the secret first."); process.exit(1); }
  const problem = await CHECKS[name](value);
  if (problem) { console.error(`✗ ${problem}`); process.exit(1); }
  saveLocal(name, value);
  if (!LOCAL_ONLY.has(name)) saveVercel(name, value);
  ps("Set-Clipboard -Value ' '");
  console.log(`✓ ${name} verified and saved (${value.slice(0, 6)}…${value.length} chars)${LOCAL_ONLY.has(name) ? " locally" : " to Vercel Production and .env.local"}. Clipboard cleared.`);
})().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
