// Browser tests. The dev server runs the real /api handlers against the REAL
// Supabase project (sign-in, drafts, audit log) and an in-memory FAKE GitHub that
// also acts as the "live website" — so publishing is exercised end to end without
// changing the real repository. Credentials come from ../../.env.local (gitignored).
//
// On this project's Windows dev machine, browsers run inside Docker via the
// Playwright relay (PW_TEST_CONNECT_WS_ENDPOINT); elsewhere Playwright runs normally.
const { defineConfig, devices } = require("@playwright/test");

const PORT = 4400;
// E2E_BASE_URL=https://stem-with-ashley.vercel.app runs the @prod smoke checks against
// production instead of a local server (no publishing happens in those).
const REMOTE = process.env.E2E_BASE_URL || "";

module.exports = defineConfig({
  testDir: ".",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: REMOTE || `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: REMOTE
    ? [{ name: "production", use: { ...devices["Desktop Chrome"] }, grep: /@prod/ }]
    : [
      { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile-only|@prod-only/ },
      { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/, grepInvert: /@prod-only/ },
    ],
  webServer: REMOTE ? undefined : {
    command: "node ../../scripts/dev-server.js",
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: false,
    env: { PORT: String(PORT), CMS_FAKE_GITHUB: "1", CMS_FAKE_DEPLOY_MS: "4000" },
    timeout: 30_000,
  },
});
