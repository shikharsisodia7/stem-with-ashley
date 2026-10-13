// Applies the admin dashboard's Supabase Auth settings through the Supabase
// Management API (needs SUPABASE_ACCESS_TOKEN in .env.local — see setup-secret.js):
//   - Site URL + allowed redirect for /admin/ (password-reset emails land correctly)
//   - public sign-ups OFF (accounts are created by invitation only)
//   - email link / OTP lifetime 24 h (invite links survive until opened)
//   - minimum password length 10
//   node scripts/apply-supabase-auth-config.js [--dry-run]

const path = require("node:path");
const { loadEnvFile } = require("./dev-server.js");

loadEnvFile(path.join(__dirname, "..", ".env.local"));
const REF = "uoitamnbnpsehxfdqvrl";
const SITE = "https://stem-with-ashley.vercel.app";
const WANT = {
  site_url: `${SITE}/admin/`,
  uri_allow_list: `${SITE}/admin/**`,
  disable_signup: true,
  mailer_otp_exp: 86400,
  password_min_length: 10,
};

(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) { console.error("SUPABASE_ACCESS_TOKEN missing — run: node scripts/setup-secret.js SUPABASE_ACCESS_TOKEN"); process.exit(1); }
  const url = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const before = await (await fetch(url, { headers })).json();
  const diff = Object.fromEntries(Object.entries(WANT).filter(([k, v]) => before[k] !== v));
  Object.keys(WANT).forEach((k) => console.log(`${k}: ${JSON.stringify(before[k])} -> ${JSON.stringify(WANT[k])}`));
  if (!Object.keys(diff).length) { console.log("Already configured."); return; }
  if (process.argv.includes("--dry-run")) return;
  const r = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(diff) });
  if (!r.ok) { console.error(`PATCH failed: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  const after = await r.json();
  const bad = Object.keys(WANT).filter((k) => after[k] !== WANT[k]);
  if (bad.length) { console.error(`Not applied: ${bad.join(", ")}`); process.exit(1); }
  console.log("✓ Supabase Auth settings applied.");
})().catch((e) => { console.error(e.message); process.exit(1); });
