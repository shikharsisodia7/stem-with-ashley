const path = require("node:path");
const { loadEnvFile } = require("../../scripts/dev-server.js");

loadEnvFile(path.join(__dirname, "..", "..", ".env.local"));

const creds = {
  admin: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
  norole: { email: process.env.E2E_NOROLE_EMAIL, password: process.env.E2E_NOROLE_PASSWORD },
};

async function signIn(page, who) {
  const c = creds[who];
  if (!c.email || !c.password) throw new Error(`Missing E2E credentials for ${who} in .env.local`);
  await page.goto("/admin/");
  await page.getByLabel("Email", { exact: true }).fill(c.email);
  await page.getByLabel("Password", { exact: true }).fill(c.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// Drafts live in the real Supabase project, so clear any left over from a previous run.
async function clearDrafts(page) {
  await page.evaluate(async () => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    const token = key ? JSON.parse(localStorage.getItem(key)).access_token : null;
    if (!token) throw new Error("not signed in");
    await Promise.all(["roadmap", "jobs", "interview"].map((doc) => fetch(`/api/draft?doc=${doc}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    })));
  });
}

module.exports = { creds, signIn, clearDrafts };
