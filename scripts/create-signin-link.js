// Creates (or reuses) a dashboard account and prints a ONE-TIME setup link — the
// command-line twin of Settings → Team access, for bootstrapping the first users.
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (see setup-secret.js).
//   node scripts/create-signin-link.js ashley@example.com admin
//   node scripts/create-signin-link.js you@example.com          (reset link, role unchanged)
// The link is printed so you can paste it into an email; never send passwords.

const path = require("node:path");
const { loadEnvFile } = require("./dev-server.js");

loadEnvFile(path.join(__dirname, "..", ".env.local"));
const BASE = "https://uoitamnbnpsehxfdqvrl.supabase.co/auth/v1/admin";
const SITE = process.env.PUBLIC_SITE_URL || "https://stem-with-ashley.vercel.app";

(async () => {
  const [emailArg, role] = process.argv.slice(2);
  const email = String(emailArg || "").trim().toLowerCase();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error("Usage: node scripts/create-signin-link.js <email> [admin|editor]"); process.exit(2); }
  if (role && !["admin", "editor"].includes(role)) { console.error("Role must be admin or editor."); process.exit(2); }
  if (!key) { console.error("SUPABASE_SERVICE_ROLE_KEY missing — run: node scripts/setup-secret.js SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
  const call = async (method, p, body) => {
    const r = await fetch(`${BASE}${p}`, { method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${method} ${p}: HTTP ${r.status} ${data.msg || data.message || ""}`);
    return data;
  };
  const users = (await call("GET", "/users?page=1&per_page=1000")).users || [];
  const existing = users.find((u) => (u.email || "").toLowerCase() === email);
  const type = existing ? "recovery" : "invite";
  if (!existing && !role) { console.error("No account with that email yet — pass a role to create one."); process.exit(1); }
  const g = await call("POST", "/generate_link", { type, email });
  const props = g.properties || g;
  const id = (existing && existing.id) || g.id || (g.user && g.user.id);
  if (role) await call("PUT", `/users/${id}`, { app_metadata: { cms_role: role } });
  console.log(`${type === "invite" ? "Invite" : "Password-reset"} link for ${email}${role ? ` (role: ${role})` : ""}:`);
  console.log(`${SITE}/admin/?setup=${encodeURIComponent(props.hashed_token)}&type=${type}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
