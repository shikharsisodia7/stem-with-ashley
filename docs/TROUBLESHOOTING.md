# Troubleshooting

Part A is for Ashley (no technical steps). Part B is for Shikhar.

## A. For Ashley

| Problem | Try this |
| --- | --- |
| I can't sign in | Check the email is spelled right, and that Caps Lock is off. Use **Forgot your password?**. If no email arrives in 10 minutes (check spam), ask Shikhar for a sign-in link. |
| My setup/reset link says it expired | Links work **once** and expire after a while. Ask Shikhar (or another Administrator) for a new one from **Settings → Team access**. |
| "This account doesn't have access" | Your account exists but hasn't been given dashboard access. Ask an Administrator. |
| "Your session has expired" / I got signed out | You were signed out after 30 minutes without activity. Sign in again. Drafts are kept. |
| I can't find something | Use the **Search** box at the top of each list. |
| "Please check the highlighted fields" | A red message under a box says what's needed, e.g. a missing name, or a web address that doesn't start with `https://`. |
| The Publish button is grey | Something must be fixed first (see the red box on **Review & Publish**), or publishing isn't connected yet (a yellow notice will say so). |
| "The live website changed while you were editing" | Someone else updated the same content. Choose **Keep my version** or **Start over from live version**. If unsure, click Cancel and ask Shikhar. |
| Publishing failed / "taking longer than usual" | The website is unchanged and your drafts are safe. Try again in a few minutes. If it keeps happening, contact Shikhar. |
| I published but the website looks the same | Wait for **✓ Live** on Review & Publish, then refresh the web page (F5). |
| I published a mistake | **Version History → Restore this version** on the last good version. |
| I deleted something by accident | If you haven't published yet: **Review & Publish → Discard all unpublished changes**. If you already published: **Version History → Restore**. |
| A career field won't delete | Majors or job listings still link to it. The message lists them; change those first. |
| The dashboard looks broken or blank | Refresh the page. Try another browser (Chrome, Edge, Safari, Firefox). If it still happens, contact Shikhar. |

## B. For Shikhar

**Check logs first:** Vercel → project → Logs (filter `/api/`). Server errors are
logged with an `[admin-api]` or `[admin-db]` prefix. Supabase → Logs → Auth /
PostgREST.

| Symptom | Cause / fix |
| --- | --- |
| Sign-in screen says "can't connect right now" | `/api/config` has no `SUPABASE_URL`/`SUPABASE_ANON_KEY` (production only), or jsDelivr was blocked. Check env vars and redeploy. |
| 503 "Sign-in is not set up on the server" | Same: Supabase env vars are missing in this environment (normal on preview deployments). |
| 503 "Publishing isn't connected yet" | `GITHUB_TOKEN` is unset. See handoff §5.1. |
| 503 "publishing access has expired or was removed" | GitHub returned 401/403: the token expired or lost access. Rotate it (handoff §7). |
| 503 "Team management isn't connected" | `SUPABASE_SERVICE_ROLE_KEY` is unset. |
| Sign-in fails with "Invalid login credentials" for everyone | Supabase project paused (Free plan, idle). Restore it in the Supabase dashboard; check the `/api/keepalive` cron is running (Vercel → Settings → Cron Jobs). |
| Reset/invite link lands on `localhost:3000` | Supabase Site URL / Redirect URLs not set (handoff §5.3). Dashboard-generated links (`?setup=`) don't depend on this. |
| Reset emails never reach Ashley | The built-in mailer only sends to your Supabase org's members. Configure custom SMTP (handoff §5.7) or use Team access → Create sign-in link. |
| Publish → 409 `head_moved` | Someone pushed to `master` mid-publish. Retrying is safe. |
| Publish → 409 `conflict` | The content file changed since the draft started (e.g. a developer commit). The user chooses keep/start-over. |
| Status stuck on "deploying"/"verifying" | Check Vercel deployments for the commit. If the deploy is fine but the live hash differs, the CDN may be serving a cached file; the `Cache-Control` header for content files is set in `vercel.json`. |
| Status "failed" | The Vercel build failed. Open the deployment link from the tracker. The previous deployment keeps serving. |
| "That older version doesn't pass today's content checks" on restore | Old content violates current validation (e.g. a non-https URL). Fix forward with a normal edit, or restore via Git. |
| A hand edit broke `jobs-data.js`/`interview-data.js` | The dashboard can't read the file (500 "couldn't be read"). Run `node --test`; the JSON between the markers must be valid. `git revert` the edit. |
| Dashboard 429 | The per-user hourly rate limit was hit (`api/_lib/db.js#rateLimit`). Wait, or raise the limit. |
| Supabase security advisor warnings after changes | Keep RLS on. Policies live in `supabase/migrations/0001_cms.sql`. |

**Rollback options**, from gentlest to strongest:
1. Dashboard → Version History → Restore (new commit; fully audited).
2. `git revert <sha> && git push origin master`.
3. Vercel → Deployments → previous production deployment → **Promote** (instant;
   overwritten by the next push to `master`).
4. Emergency stop: remove `GITHUB_TOKEN` from Vercel and redeploy. The dashboard keeps
   working for drafts, but nothing can be published.
