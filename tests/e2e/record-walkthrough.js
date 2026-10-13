// Records the handoff walkthrough video (real browser, real clicks) with on-screen
// captions and a visible cursor. Follows docs/SCREEN-RECORDING-SCRIPT.md.
//   Parts 1-2 (using the apps) run on the LIVE public site.
//   Parts 3-5 (admin dashboard) run on a local practice copy: same code, real
//   Supabase sign-in, but publishing goes to an in-memory fake repository, so no
//   demo content ever reaches the real website.
//
//   node tests/e2e/record-walkthrough.js <output-dir>
// Browsers run in Docker via the Playwright relay (never launched on Windows).

const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("@playwright/test");
const { start } = require("../../scripts/dev-server.js");
const { creds } = require("./helpers");

const OUT = path.resolve(process.argv[2] || path.join(__dirname, "recording"));
const LIVE = "https://stem-with-ashley.vercel.app";
const PORT = 4430;
const LOCAL = `http://localhost:${PORT}`;
const W = 1280;
const H = 720;

const OVERLAY = `
(() => {
  if (!document.documentElement || !document.body || document.getElementById("rec-caption")) return;
  const style = document.createElement("style");
  style.textContent = \`
    #rec-caption { position: fixed; left: 50%; transform: translateX(-50%); bottom: 22px; z-index: 2147483646;
      max-width: 1000px; width: calc(100% - 80px); background: rgba(17, 24, 39, 0.92); color: #fff;
      font: 600 22px/1.4 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; padding: 14px 22px;
      border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.35); pointer-events: none; text-align: center;
      transition: opacity .25s ease; }
    #rec-caption.raised { bottom: 96px; }
    #rec-caption small { display: block; font-weight: 500; font-size: 15px; color: #fde68a; margin-bottom: 4px; letter-spacing: .03em; text-transform: uppercase; }
    #rec-cursor { position: fixed; z-index: 2147483647; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; background: rgba(234, 179, 8, .55); border: 3px solid #b45309; pointer-events: none;
      transition: left .55s ease, top .55s ease, transform .15s ease; left: 50%; top: 40%; }
    #rec-cursor.press { transform: scale(.7); }
    #rec-title { position: fixed; inset: 0; z-index: 2147483645; display: flex; flex-direction: column; align-items: center;
      justify-content: center; background: linear-gradient(135deg, #123f9e, #1a56db); color: #fff; text-align: center;
      font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; }
    #rec-title h1 { font-size: 48px; margin: 0 0 16px; } #rec-title p { font-size: 24px; margin: 6px 0; opacity: .95; }
  \`;
  document.documentElement.appendChild(style);
  const cap = document.createElement("div"); cap.id = "rec-caption"; cap.style.opacity = "0";
  const cur = document.createElement("div"); cur.id = "rec-cursor";
  document.documentElement.appendChild(cap); document.documentElement.appendChild(cur);
  const pos = sessionStorage.getItem("rec-cursor");
  if (pos) { const [x, y] = JSON.parse(pos); cur.style.transition = "none"; cur.style.left = x + "px"; cur.style.top = y + "px"; requestAnimationFrame(() => { cur.style.transition = ""; }); }
})();`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  process.env.CMS_FAKE_DEPLOY_MS = "7000";
  const srv = await start({ port: PORT, fakeGithub: true });
  const browser = await chromium.connect("ws://127.0.0.1:45999/", { exposeNetwork: "<loopback>" });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: path.join(OUT, "raw"), size: { width: W, height: H } },
  });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();
  const started = Date.now();

  const wait = (ms) => page.waitForTimeout(ms);
  async function overlay() { await page.evaluate(OVERLAY).catch(() => {}); }
  async function caption(text, chapter, ms) {
    await overlay();
    await page.evaluate(([t, c]) => {
      const el = document.getElementById("rec-caption");
      el.innerHTML = "";
      if (c) { const s = document.createElement("small"); s.textContent = c; el.appendChild(s); }
      el.appendChild(document.createTextNode(t));
      el.classList.toggle("raised", Boolean(document.querySelector(".editor-actions, .draft-bar:not([hidden])")));
      el.style.opacity = t ? "1" : "0";
    }, [text, chapter || ""]);
    await wait(ms === undefined ? Math.max(3200, text.length * 62) : ms);
  }
  async function hideCaption() {
    await page.evaluate(() => { const el = document.getElementById("rec-caption"); if (el) el.style.opacity = "0"; }).catch(() => {});
  }
  async function title(lines, ms) {
    await overlay();
    await page.evaluate((ls) => {
      const d = document.createElement("div"); d.id = "rec-title";
      ls.forEach((l, i) => { const e = document.createElement(i === 0 ? "h1" : "p"); e.textContent = l; d.appendChild(e); });
      document.documentElement.appendChild(d);
    }, lines);
    await wait(ms);
    await page.evaluate(() => { const d = document.getElementById("rec-title"); if (d) d.remove(); });
  }
  async function point(locator) {
    await overlay();
    await locator.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" })).catch(() => locator.scrollIntoViewIfNeeded());
    await wait(250);
    const box = await locator.boundingBox();
    if (!box) return;
    const x = box.x + Math.min(box.width / 2, 60);
    const y = box.y + box.height / 2;
    await page.evaluate(([px, py]) => {
      const c = document.getElementById("rec-cursor");
      c.style.left = px + "px"; c.style.top = py + "px";
      sessionStorage.setItem("rec-cursor", JSON.stringify([px, py]));
    }, [x, y]);
    await wait(700);
  }
  async function click(locator, after) {
    await point(locator);
    await page.evaluate(() => document.getElementById("rec-cursor").classList.add("press"));
    await wait(150);
    await locator.click();
    await page.evaluate(() => { const c = document.getElementById("rec-cursor"); if (c) c.classList.remove("press"); }).catch(() => {});
    await wait(after === undefined ? 900 : after);
  }
  async function type(locator, text, clear) {
    await click(locator, 200);
    if (clear) await locator.fill("");
    await locator.pressSequentially(text, { delay: 38 });
    await wait(500);
  }
  async function scrollBy(px, steps) {
    const n = steps || 6;
    for (let i = 0; i < n; i += 1) { await page.mouse.wheel(0, px / n); await wait(120); }
    await wait(500);
  }
  async function go(url, settle) { await page.goto(url); await overlay(); await wait(settle || 1200); }

  // ---------------- Part 1: Introduction ----------------
  await go(LIVE + "/");
  await title(["STEM with Ashley", "How to use and update your website", "A step-by-step walkthrough"], 6000);
  await caption("This is your live website: stem-with-ashley.vercel.app. Anyone can use it, with no sign-in.", "Part 1 · Introduction");
  await caption("It has eight apps: the Career Roadmap, Majors, Skills, Interview Prep, a Worksheet Generator, Resources, a Job Finder, and My Shortlist.");
  await caption("First we'll tour each app. Then we'll update content using your private admin dashboard.");

  // ---------------- Part 2: Using the apps ----------------
  await caption("The home page lists 12 STEM career fields. Click any field to see its five-year roadmap.", "Part 2 · Career Roadmap");
  await scrollBy(500);
  await click(page.getByRole("link", { name: /Biomedical Engineering/ }).first(), 1500);
  await caption("Each field shows four career stages — from entry level (years 0–1) to senior leadership (5+).");
  await scrollBy(450);
  await caption("Students can watch or listen to real professionals here, in the YouTube and podcast picks.");
  await scrollBy(600);
  await caption("Below that: companies that hire, and certifications. Each certification links to its official page.");
  await click(page.locator(".star-btn").nth(1), 900);
  await caption("Click a ☆ star to save anything to My Shortlist. Graduate programs, conferences and organizations follow.");
  await scrollBy(700);

  await go(LIVE + "/#/majors");
  await caption("College Majors helps students who are still choosing what to study.", "Part 2 · Majors Explorer");
  await click(page.getByRole("link", { name: /Biomedical Engineering/ }).first(), 1400);
  await caption("Each major shows typical courses, why students choose it, and the career fields it leads to.");
  await scrollBy(400);

  await go(LIVE + "/#/skills");
  await caption("Developmental Skills covers the non-technical skills every STEM career needs.", "Part 2 · Skills");
  await click(page.locator("details.skill-block summary").first(), 1200);
  await caption("Click a skill to see books, courses, and organizations that help build it.");

  await go(LIVE + "/#/interview");
  await caption("Interview Prep is a 14-step guide. Students move through it with Next and Back.", "Part 2 · Interview Preparation");
  await go(LIVE + "/#/interview/3");
  await caption("Step 3 teaches the STAR method: Situation, Task, Action, Result.");
  await scrollBy(500);
  await go(LIVE + "/#/interview/4");
  await caption("Step 4 is a STAR worksheet where students draft their own answers. It saves automatically in their browser.");
  await type(page.locator("#star-situation"), "During my senior design project, our prototype failed testing two weeks before the demo.");
  await go(LIVE + "/#/interview/6");
  await caption("Step 6 is the Question Bank: over 120 behavioral, situational, and technical questions with tips.");
  await type(page.locator("#qb-search"), "team");
  await caption("Students can search, filter by difficulty, mark favorites, and type practice answers.");
  await go(LIVE + "/#/interview/8");
  await caption("Step 8 lets students record a practice video with their camera. The video never leaves their device.");
  await caption("Later steps cover self-review, questions to ask the interviewer, and before, during and after checklists.");

  await go(LIVE + "/#/worksheet");
  await caption("The Worksheet Generator turns class notes into a printable practice worksheet.", "Part 2 · Worksheet Generator");
  await type(page.locator("#worksheet-title"), "Photosynthesis");
  await click(page.locator("#worksheet-notes"), 200);
  await page.locator("#worksheet-notes").fill("Photosynthesis is the process plants use to convert light energy into chemical energy. Chlorophyll absorbs light mostly in the blue and red wavelengths. The light-dependent reactions occur in the thylakoid membranes. The Calvin cycle takes place in the stroma and fixes carbon dioxide into sugars. Oxygen is released as a byproduct of splitting water molecules.");
  await caption("Paste notes or a lesson summary, choose how many questions, then click Generate Worksheet.");
  await click(page.locator("#worksheet-generate-btn"), 1500);
  await scrollBy(500);
  await click(page.locator("#worksheet-answer-key-toggle"), 900);
  await caption("Tick Show answer key if you want answers, then print or save it as a PDF.");

  await go(LIVE + "/#/resources");
  await caption("Resources lists trusted career-exploration websites, like the O*NET Interest Profiler quiz.", "Part 2 · Resources");

  await go(LIVE + "/jobs/");
  await caption("The Job Finder searches early-career STEM jobs by keyword, field, level, and location.", "Part 2 · Job Finder");
  await click(page.getByLabel("STEM field"), 300);
  await page.getByLabel("STEM field").selectOption({ label: "Computer Science / Software Engineering" });
  await wait(900);
  await caption("Every listing is labeled. A Sample listing is just an example; real listings link to the original job posting.");
  await page.getByLabel("STEM field").selectOption({ label: "All fields" });
  await type(page.getByLabel("Keyword"), "intern");

  await go(LIVE + "/#/shortlist");
  await caption("My Shortlist collects everything a student starred, ready to print for a coaching session.", "Part 2 · My Shortlist");
  await caption("Shortlists and practice answers stay private, saved only in that student's own browser.");

  // ---------------- Part 3: Admin dashboard ----------------
  await go(LOCAL + "/admin/");
  await caption("Now, updating the website. Your admin dashboard is at stem-with-ashley.vercel.app/admin.", "Part 3 · Your Admin Dashboard");
  await caption("(For this video we're using a practice copy of the dashboard, so nothing on the real website changes.)");
  await caption("Sign in with your email and password. The first time, you'll use the one-time setup link Shikhar sends you.");
  await type(page.getByLabel("Email", { exact: true }), creds.admin.email);
  await type(page.getByLabel("Password", { exact: true }), creds.admin.password);
  await click(page.getByRole("button", { name: "Sign in" }), 2500);
  await page.evaluate(async () => {
    const k = Object.keys(localStorage).find((x) => x.endsWith("-auth-token"));
    const t = JSON.parse(localStorage.getItem(k)).access_token;
    await Promise.all(["roadmap", "jobs", "interview"].map((d) => fetch(`/api/draft?doc=${d}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } })));
  });
  await page.reload(); await overlay(); await page.getByRole("heading", { name: "Welcome back" }).waitFor(); await wait(1200);
  await caption("This is the Overview: website status, quick actions, and counts of all your content.");
  await caption("The menu on the left lists every kind of content you can edit.");
  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "Career Fields" }), 1200);
  await caption("Here are all 12 career fields. Use the search box to find one quickly.");
  await type(page.getByLabel("Search career fields"), "bio");
  await click(page.getByRole("link", { name: "Biomedical Engineering", exact: true }), 1400);
  await caption("Everything about the field is in normal boxes. Boxes with a red star are required.");
  const summary = page.getByLabel(/One-sentence summary/);
  await click(summary, 300);
  await page.keyboard.press("End");
  await summary.pressSequentially(" Many roles are in hospitals and medical-device companies.", { delay: 38 });
  await wait(600);
  await caption("I've added a sentence to the summary. The dashboard marks the page as having unsaved changes.");
  await click(page.getByRole("button", { name: "Save draft" }), 1500);
  await caption("Save draft keeps the change safely, even if you sign out. The public website does not change yet.");
  await click(page.getByRole("button", { name: "Preview on website" }), 2500);
  await caption("Preview on website shows the real site with your changes. Only you can see it.");
  await click(page.getByRole("button", { name: "Close preview" }), 800);
  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: /Review & Publish/ }), 1800);
  await caption("Review & Publish lists every change waiting to go live, and anything that needs fixing first.");
  await click(page.getByRole("button", { name: "Publish to live website" }), 1200);
  await caption("Click Publish, then confirm.");
  await click(page.getByRole("dialog").getByRole("button", { name: "Publish now" }), 1500);
  await caption("The progress box tracks it: saved, rebuilding, then Live. On the real site this takes about a minute.");
  await page.locator(".tracker", { hasText: "✓ Live" }).waitFor({ timeout: 90000 });
  await wait(800);
  await caption("✓ Live. The change is now on the website.");
  await go(LOCAL + "/#/field/biomedical-engineering", 1500);
  await caption("Here's the (practice) website showing the new sentence. On your real site, refresh if you still see the old version.");
  await go(LOCAL + "/admin/#/overview", 1500);

  // ---------------- Part 4: More admin features ----------------
  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "College Majors" }), 1200);
  await caption("Majors work the same way. Open one, edit its text, and tick the career fields it leads to.", "Part 4 · More things you can edit");
  await click(page.getByRole("link", { name: "Mechanical Engineering", exact: true }), 1300);
  await scrollBy(500);
  await click(page.getByLabel("Aerospace Engineering"), 900);
  await click(page.getByRole("button", { name: "Save draft" }), 1300);

  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "Career Fields" }), 900);
  await click(page.getByRole("link", { name: "Civil Engineering", exact: true }), 1200);
  await caption("To add a certification, scroll to Certifications and click + Add certification.");
  await page.getByRole("heading", { name: "Certifications" }).scrollIntoViewIfNeeded();
  await scrollBy(300);
  await click(page.getByRole("button", { name: "+ Add certification" }), 900);
  const certNames = page.locator('[data-path^="certifications."][data-path$=".name"]');
  const n = await certNames.count();
  await type(certNames.nth(n - 1), "Envision Sustainability Professional (ENV SP)");
  await type(page.locator(`[data-path="certifications.${n - 1}.provider"]`), "Institute for Sustainable Infrastructure");
  await type(page.locator(`[data-path="certifications.${n - 1}.url"]`), "https://sustainableinfrastructure.org/");
  await caption("Web addresses must start with https://. Use the Test link button to check it opens the right page.");
  await click(page.getByRole("button", { name: "Save draft" }), 1300);

  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "Career Resources" }), 1000);
  await caption("Career Resources: add a website students should know about, with a short description.");
  await click(page.getByRole("link", { name: /Add resource/ }), 1000);
  await type(page.getByLabel(/Resource name/), "CareerOneStop");
  await type(page.getByLabel(/Web address/), "https://www.careeronestop.org/");
  await type(page.getByLabel(/Who runs it/), "U.S. Department of Labor");
  await click(page.getByRole("button", { name: "Save draft" }), 1300);

  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "Job Finder" }), 1000);
  await caption("Job Finder: add, edit, or remove listings. Keep 'sample' ticked unless it's a real, open job.");
  await click(page.getByRole("link", { name: /Add job listing/ }), 1000);
  await type(page.getByLabel("Job title"), "Environmental Engineer I");
  await type(page.getByLabel("Company"), "Greenway Engineering (sample)");
  await page.getByLabel("STEM field").selectOption({ label: "Civil Engineering" });
  await type(page.getByLabel(/Location/), "Portland, OR");
  await type(page.getByLabel(/One-sentence description/), "Support stormwater design and permitting for municipal projects.");
  await caption("For a real job, untick Sample and paste the link to the original posting — the dashboard insists on it.");
  await click(page.getByRole("button", { name: "Save draft" }), 1300);

  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: /Review & Publish/ }), 1800);
  await caption("All of those drafts are listed here together. When you're happy, publish them in one go.");
  await click(page.getByRole("button", { name: "Discard all unpublished changes" }), 900);
  await caption("Or, if you change your mind, Discard all unpublished changes puts everything back.");
  await click(page.getByRole("dialog").getByRole("button", { name: "Discard everything" }), 1500);

  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "Version History" }), 1800);
  await caption("Version History lists every published version: when, and who published it.", "Part 4 · Undo with Version History");
  await click(page.locator(".version-card details summary").first(), 1000);
  await caption("Made a mistake? Click Restore this version on the last good one.");
  await click(page.locator(".version-card").nth(1).getByRole("button", { name: "Restore this version" }), 1000);
  await caption("Confirm, and the website goes back to that version. Nothing is ever lost — you can switch back again.");
  await click(page.getByRole("dialog").getByRole("button", { name: "Restore and publish" }), 1500);
  await page.locator(".tracker", { hasText: "✓ Live" }).waitFor({ timeout: 90000 });
  await caption("Restored and live.");
  await scrollBy(600);
  await caption("The Activity log underneath records every publish, restore, and deletion.");

  // ---------------- Part 5: Conclusion ----------------
  await hideCaption(); await click(page.locator("#sidebar").getByRole("link", { name: "Help" }), 1200);
  await caption("To recap: Sign in → choose what to change → edit → Save draft → Preview → Publish → check the website.", "Part 5 · Summary");
  await caption("Help / Instructions (top right) opens the full step-by-step guide with pictures, any time.");
  await go(LOCAL + "/admin/guide.html", 1500);
  await scrollBy(900);
  await go(LOCAL + "/admin/#/overview", 1200);
  await caption("Layout or design changes, new kinds of pages, or anything the dashboard says to ask about: contact Shikhar.");
  await click(page.getByRole("button", { name: "Sign out" }), 1200);
  await caption("Click Sign out when you're done. For safety you're also signed out after 30 minutes of inactivity.");
  await title(["You're all set!", "Website: stem-with-ashley.vercel.app", "Dashboard: stem-with-ashley.vercel.app/admin"], 6000);

  const video = page.video();
  await context.close();
  const webm = path.join(OUT, "walkthrough.webm");
  await video.saveAs(webm);
  await browser.close();
  srv.close();
  console.log(`recorded ${Math.round((Date.now() - started) / 1000)}s -> ${webm}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
