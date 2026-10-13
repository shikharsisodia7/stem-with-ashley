// Server configuration, read from environment variables (see .env.example).
// Secrets (GITHUB_TOKEN, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET) are only ever
// read here, on the server, and are never sent to the browser.

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function config() {
  return {
    supabaseUrl: env("SUPABASE_URL", "").replace(/\/$/, ""),
    supabaseAnonKey: env("SUPABASE_ANON_KEY", ""),
    supabaseServiceKey: env("SUPABASE_SERVICE_ROLE_KEY", ""),
    githubToken: env("GITHUB_TOKEN", ""),
    githubRepo: env("GITHUB_REPO", "shikharsisodia7/stem-with-ashley"),
    githubBranch: env("GITHUB_BRANCH", "master"),
    githubApiUrl: env("GITHUB_API_URL", "https://api.github.com").replace(/\/$/, ""),
    siteUrl: env("PUBLIC_SITE_URL", "https://stem-with-ashley.vercel.app").replace(/\/$/, ""),
    cronSecret: env("CRON_SECRET", ""),
  };
}

module.exports = { config };
