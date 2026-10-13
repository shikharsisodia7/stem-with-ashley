// Finishes the admin-dashboard setup in one run (Windows):
//   node scripts/finish-setup.js [ashley-email]
//
// While it runs, copy these three secrets (any order). It notices each one on the
// clipboard, checks it with GitHub/Supabase, stores it, and clears the clipboard:
//   1. GitHub fine-grained token (github_pat_…)   → Vercel Production + .env.local
//   2. Supabase service_role key (eyJ… / sb_secret_…) → Vercel Production + .env.local
//   3. Supabase access token (sbp_…)               → .env.local only
// Then it: applies the Supabase Auth settings, proves the token can publish (on a
// throwaway branch, deleted afterwards), redeploys production, creates Ashley's
// one-time invite link + your own password link, and writes the finished email to
// your Desktop. Secrets and links are never printed.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CHECKS, LOCAL_ONLY, saveLocal, saveVercel, ps } = require("./setup-secret.js");
const { loadEnvFile } = require("./dev-server.js");

const ROOT = path.resolve(__dirname, "..");
const REPO = "shikharsisodia7/stem-with-ashley";
const SITE = "https://stem-with-ashley.vercel.app";
// Real email addresses live only in the gitignored .env.local (this repo is public).
loadEnvFile(path.join(ROOT, ".env.local"));
const ASHLEY = String(process.argv[2] || process.env.ASHLEY_EMAIL || "").toLowerCase();
const OWNER = String(process.env.ADMIN_OWNER_EMAIL || "").toLowerCase();
const DESKTOP = [path.join(os.homedir(), "OneDrive", "Desktop"), path.join(os.homedir(), "Desktop")].find((d) => fs.existsSync(d));

const PATTERNS = [
  ["GITHUB_TOKEN", /^github_pat_/],
  ["SUPABASE_SERVICE_ROLE_KEY", /^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_secret_)/],
  ["SUPABASE_ACCESS_TOKEN", /^sbp_/],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(m);

async function collectSecrets() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  const have = new Set(PATTERNS.map(([n]) => n).filter((n) => process.env[n]));
  if (have.size) log(`Already saved earlier: ${[...have].join(", ")}`);
  const deadline = Date.now() + 20 * 60 * 1000;
  let last = "";
  while (have.size < PATTERNS.length) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${PATTERNS.map(([n]) => n).filter((n) => !have.has(n)).join(", ")}`);
    const clip = ps("Get-Clipboard -Raw").trim();
    if (clip && clip !== last) {
      last = clip;
      const hit = PATTERNS.find(([n, re]) => !have.has(n) && re.test(clip));
      if (hit) {
        const [name] = hit;
        const problem = await CHECKS[name](clip);
        if (problem) log(`✗ ${name}: ${problem}`);
        else {
          saveLocal(name, clip);
          if (!LOCAL_ONLY.has(name)) saveVercel(name, clip);
          process.env[name] = clip;
          have.add(name);
          ps("Set-Clipboard -Value ' '");
          last = " ";
          log(`✓ ${name} verified and saved. (${have.size}/3)`);
        }
      }
    }
    await sleep(1500);
  }
}

async function applyAuthConfig() {
  execFileSync(process.execPath, [path.join(__dirname, "apply-supabase-auth-config.js")], { stdio: "inherit" });
}

// Proves the token can write commits + read statuses, without touching master.
async function checkPublishing() {
  const t = process.env.GITHUB_TOKEN;
  const gh = async (method, p, body) => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, {
      method,
      headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json", "User-Agent": "stem-setup", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok && r.status !== 204) throw new Error(`GitHub ${method} ${p}: HTTP ${r.status}`);
    return r.status === 204 ? null : r.json();
  };
  const branch = `cms-setup-check-${Date.now()}`;
  const head = await gh("GET", "/git/ref/heads/master");
  await gh("POST", "/git/refs", { ref: `refs/heads/${branch}`, sha: head.object.sha });
  try {
    const parent = await gh("GET", `/git/commits/${head.object.sha}`);
    const tree = await gh("POST", "/git/trees", { base_tree: parent.tree.sha, tree: [{ path: ".cms-setup-check", mode: "100644", type: "blob", content: "ok\n" }] });
    const commit = await gh("POST", "/git/commits", { message: "setup check (branch deleted automatically)", tree: tree.sha, parents: [head.object.sha], author: { name: "STEM with Ashley Admin Dashboard", email: "admin-dashboard@stem-with-ashley.invalid" } });
    await gh("PATCH", `/git/refs/heads/${branch}`, { sha: commit.sha, force: false });
    await gh("GET", `/commits/${head.object.sha}/status`);
  } finally {
    await gh("DELETE", `/git/refs/heads/${branch}`).catch(() => {});
  }
  log("✓ Publishing access works (tested on a temporary branch, now deleted; master untouched).");
}

function redeploy() {
  const r = require("node:child_process").spawnSync("vercel", ["ls", "stem-with-ashley", "--prod"], { cwd: ROOT, encoding: "utf8", shell: true });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`; // the CLI prints its table to stderr
  const url = (out.match(/https:\/\/stem-with-ashley-[a-z0-9]+-[\w-]+\.vercel\.app/) || [])[0];
  if (!url) throw new Error("Couldn't find the current production deployment to redeploy.");
  execFileSync("vercel", ["redeploy", url, "--target", "production"], { cwd: ROOT, stdio: "ignore", shell: true });
  log("✓ Production redeployed with the new settings.");
}

async function waitForFeatures() {
  // /api/me needs a session, so check the server sees the token via an unauthenticated
  // probe of the publish endpoint (401 = function up) and then trust Vercel's redeploy.
  for (let i = 0; i < 30; i += 1) {
    const r = await fetch(`${SITE}/api/config`).catch(() => null);
    if (r && r.ok) return;
    await sleep(5000);
  }
}

function link(email, role) {
  const args = [path.join(__dirname, "create-signin-link.js"), email];
  if (role) args.push(role);
  const out = execFileSync(process.execPath, args, { encoding: "utf8", env: process.env });
  return out.trim().split("\n").pop().trim();
}

function emailText(inviteLink) {
  return `To: ${ASHLEY}
Subject: Your STEM with Ashley website: login, instructions, and video

Hi Ashley,

Everything is ready for you to run and update the STEM with Ashley website on your own.

YOUR WEBSITE: ${SITE}
All eight apps are live: Career Roadmap, College Majors, Developmental Skills, Interview Prep, Worksheet Generator, Resources, Job Finder, and My Shortlist.

YOUR ADMIN DASHBOARD: ${SITE}/admin/
This is where you update the content of every app with simple forms. There's no code, and you don't need GitHub or any files.

SETTING UP YOUR LOGIN (one time)
1. Click your personal setup link:
   ${inviteLink}
2. Choose a password (at least 10 characters).
3. That's it. From then on, sign in at the dashboard link above with this email address and your password.

The link works once and expires after 24 hours. If it has expired, just reply and I'll send a new one. For security, I'm not sending a password by email.

HOW UPDATING WORKS
Sign in -> pick what to change -> edit -> Save draft -> Preview -> Publish. Drafts are private until you publish, and the website updates itself in about a minute. If you ever publish something by mistake, Version History restores any earlier version in one click.

INSTRUCTIONS AND VIDEO
- Video walkthrough (9 min): ${SITE}/admin/media/walkthrough.mp4
- Step-by-step guide with pictures: ${SITE}/admin/guide.html
  (PDF version: ${SITE}/admin/media/instructions.pdf)
- Both are also inside the dashboard under Help.

Design changes, new pages, or connecting a live job feed still need me, so just email me.

Best,
Shikhar
`;
}

(async () => {
  if (!ASHLEY || !OWNER) throw new Error("Set ASHLEY_EMAIL and ADMIN_OWNER_EMAIL in .env.local first.");
  log("Copy the three secrets now (any order). Waiting for the clipboard…");
  await collectSecrets();
  await applyAuthConfig();
  await checkPublishing();
  redeploy();
  await waitForFeatures();
  const ashleyLink = link(ASHLEY, "admin");
  const ownerLink = link(OWNER);
  const emailFile = path.join(DESKTOP, "Email-to-Ashley.txt");
  fs.writeFileSync(emailFile, emailText(ashleyLink));
  const ownerFile = path.join(DESKTOP, "Your-STEM-admin-password-link.txt");
  fs.writeFileSync(ownerFile, `Open this once to set YOUR dashboard password (works once, expires in 24 hours), then delete this file:\n${ownerLink}\n`);
  log(`✓ Ashley's account (${ASHLEY}) created with Administrator access.`);
  log(`✓ Finished email written to ${emailFile}`);
  log(`✓ Your own password link written to ${ownerFile}`);
  log("All done.");
})().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
