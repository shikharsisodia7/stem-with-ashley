// Server-side authentication + authorization for every admin API call.
// The browser sends its Supabase access token; we ask Supabase Auth who it belongs
// to (this checks signature, expiry, and that the user still exists) and then
// require an admin dashboard role in app_metadata — which only the service-role
// key can set, so signing up on your own never grants access.

const { HttpError } = require("./http");
const { config } = require("./config");

const ROLES = ["admin", "editor"];

function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const m = /^Bearer\s+([A-Za-z0-9._~+/=-]+)$/.exec(h);
  return m ? m[1] : null;
}

async function requireUser(req, opts) {
  const options = opts || {};
  const cfg = config();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    throw new HttpError(503, "Sign-in is not set up on the server yet (missing Supabase settings).");
  }
  const token = bearer(req);
  if (!token) throw new HttpError(401, "Please sign in.");

  let res;
  try {
    res = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    throw new HttpError(503, "Couldn't reach the sign-in service. Please try again in a minute.");
  }
  if (res.status === 401 || res.status === 403) throw new HttpError(401, "Your session has expired. Please sign in again.");
  if (!res.ok) throw new HttpError(503, "The sign-in service had a problem. Please try again in a minute.");

  const user = await res.json();
  const role = (user.app_metadata && user.app_metadata.cms_role) || "";
  if (!ROLES.includes(role)) {
    throw new HttpError(403, "This account doesn't have access to the admin dashboard. Ask the site owner to give you access.");
  }
  if (options.role === "admin" && role !== "admin") {
    throw new HttpError(403, "Only dashboard administrators can do that.");
  }
  return { token, user, role, email: user.email || "" };
}

module.exports = { requireUser, bearer, ROLES };
