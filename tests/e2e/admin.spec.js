// Admin dashboard end-to-end: real Supabase sign-in + drafts, fake GitHub publishing.
const { test, expect } = require("@playwright/test");
const { signIn, clearDrafts } = require("./helpers");

test.describe.configure({ mode: "serial" });

test("anonymous visitors see only the sign-in screen and cannot call admin APIs", async ({ page, request }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("#dashboard")).toBeHidden();
  for (const [method, path] of [["get", "/api/content"], ["put", "/api/draft"], ["post", "/api/publish"], ["get", "/api/history"], ["post", "/api/restore"], ["get", "/api/team"]]) {
    const res = await request[method](path, { data: method === "get" ? undefined : {} });
    expect(res.status(), `${method} ${path}`).toBe(401);
  }
  const forged = await request.get("/api/content", { headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.e30.forged" } });
  expect(forged.status()).toBe(401);
});

test("wrong password shows a friendly error", async ({ page }) => {
  await page.goto("/admin/");
  await page.getByLabel("Email", { exact: true }).fill("cms-e2e-admin@stemwithashley.test");
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("#auth-message")).toContainText("don't match");
});

test("a signed-in account without dashboard access is turned away", async ({ page }) => {
  await signIn(page, "norole");
  await expect(page.locator("#auth-message")).toContainText("doesn't have access");
  await expect(page.locator("#dashboard")).toBeHidden();
});

test("full workflow: edit → save draft → reload → preview → publish → live → history → restore → sign out", async ({ page, context }) => {
  const marker = `E2E marker ${Date.now()}`;
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await clearDrafts(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

  // Open a career field and change its summary.
  await page.getByRole("link", { name: "Career Fields" }).first().click();
  await expect(page.getByRole("heading", { name: "Career Fields" })).toBeVisible();
  await page.getByRole("link", { name: "Aerospace Engineering", exact: true }).click();
  const summary = page.getByLabel(/One-sentence summary/);
  await summary.fill(`Aerospace engineers design aircraft and spacecraft. ${marker}`);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("#toast")).toContainText("Draft saved");

  // Drafts persist across a full reload (stored server-side, not in the browser).
  await page.reload();
  await expect(page.getByLabel(/One-sentence summary/)).toHaveValue(new RegExp(marker));
  await page.getByRole("link", { name: /All career fields/ }).click();
  await expect(page.getByText("Edited — not published").first()).toBeVisible();

  // The public site does NOT show the draft yet.
  const publicPage = await context.newPage();
  await publicPage.goto("/#/field/aerospace-engineering");
  await expect(publicPage.getByRole("heading", { name: /Aerospace Engineering/ })).toBeVisible();
  await expect(publicPage.getByText(marker)).toHaveCount(0);

  // Preview shows it inside the dashboard.
  await page.getByRole("link", { name: "Aerospace Engineering", exact: true }).click();
  await page.getByRole("button", { name: "Preview on website" }).click();
  const frame = page.frameLocator("#preview-frame");
  await expect(frame.getByText("Preview of unpublished changes")).toBeVisible();
  await expect(frame.getByRole("heading", { name: /Aerospace Engineering/ })).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();

  // Review & Publish lists the change, then publish.
  await page.getByRole("link", { name: /Review & Publish/ }).first().click();
  await expect(page.locator(".change-list")).toContainText("Aerospace Engineering");
  await page.getByRole("button", { name: "Publish to live website" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish now" }).click();
  await expect(page.locator("#toast")).toContainText("Published");
  await expect(page.locator(".tracker")).toContainText("✓ Live", { timeout: 60_000 });

  // The public site now shows the published change.
  await publicPage.goto("/");
  await publicPage.goto("/#/");
  await expect(publicPage.getByText(marker)).toBeVisible();

  // Version history shows who published it; restore the previous version.
  await page.getByRole("link", { name: "Version History" }).click();
  await expect(page.locator(".version-card").first()).toContainText("cms-e2e-admin@stemwithashley.test");
  await page.locator(".version-card").nth(1).getByRole("button", { name: "Restore this version" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restore and publish" }).click();
  await expect(page.locator(".tracker")).toContainText("Latest publish (restore)");
  await expect(page.locator(".tracker")).toContainText("✓ Live", { timeout: 60_000 });
  await publicPage.reload();
  await expect(publicPage.getByText(marker)).toHaveCount(0);

  // Sign out: the dashboard disappears and the API rejects the old session's absence.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("add a job listing: real listings require a source link; validation shows inline", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await clearDrafts(page);
  await page.goto("/admin/#/c/jobs/new");
  await expect(page.getByRole("heading", { name: "New job listing" })).toBeVisible();
  await page.getByLabel("Job title").fill("E2E Field Engineer");
  await page.getByLabel("Company").fill("E2E Company");
  await page.getByLabel("STEM field").selectOption({ label: "Civil Engineering" });
  await page.getByLabel(/Location/).fill("Denver, CO");
  await page.getByLabel(/One-sentence description/).fill("Support field inspections.");
  await page.getByLabel(/This is a SAMPLE listing/).uncheck();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator(".field-error")).toContainText("original posting");
  await page.getByLabel(/Link to the real job posting/).fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator(".field-error")).toContainText("https://");
  await page.getByLabel(/Link to the real job posting/).fill("https://careers.example.org/e2e");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("#toast")).toContainText("Draft saved. It's not on the live website");
  await page.getByRole("link", { name: /All job finder/ }).click();
  await expect(page.locator(".item-card", { hasText: "E2E Field Engineer" })).toContainText("Real listing");
  await clearDrafts(page);
});

test("deleting a career field that majors or jobs still use is blocked", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await page.goto("/admin/#/c/fields");
  await page.locator(".item-card", { hasText: "Civil Engineering" }).getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("still linked");
  await expect(dialog).toContainText("College Majors");
  await dialog.getByRole("button", { name: "OK" }).click();
});

test("leaving a page with unsaved edits asks first", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await page.goto("/admin/#/c/skills/0");
  await page.getByLabel("Skill name").fill("Public Speaking (edited)");
  await page.getByRole("link", { name: "Overview" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("unsaved changes");
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Skill name")).toHaveValue("Public Speaking (edited)");
  await page.getByRole("link", { name: "Overview" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
});

test("editing an interview question keeps its ID and the interview app still works", async ({ page, context }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await clearDrafts(page);
  await page.goto("/admin/#/c/questions/0");
  await expect(page.getByText("beh-tell-me-about-yourself")).toBeAttached();
  await page.getByLabel("Tip for answering").fill("E2E tip: keep it under two minutes.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("#toast")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Preview on website" }).click();
  const frame = page.frameLocator("#preview-frame");
  await expect(frame.getByRole("heading", { name: /Question Bank/ })).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await clearDrafts(page);
});

test("dashboard works on a phone-sized screen @mobile @mobile-only", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await page.getByRole("button", { name: /Menu/ }).click();
  await page.locator("#sidebar").getByRole("link", { name: "College Majors" }).click();
  await expect(page.getByRole("heading", { name: "College Majors" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
