// Production checks for the admin dashboard (run with E2E_BASE_URL set). Uses the
// test-only admin account; saves and then DISCARDS a draft. Never publishes.
const { test, expect } = require("@playwright/test");
const { signIn, clearDrafts } = require("./helpers");

test("production: anonymous API access is refused @prod @prod-only", async ({ request }) => {
  for (const p of ["/api/content", "/api/history", "/api/team", "/api/me"]) {
    expect((await request.get(p)).status(), p).toBe(401);
  }
  expect((await request.post("/api/publish", { data: {} })).status()).toBe(401);
});

test("production: sign in, load content, draft persists, preview, discard @prod @prod-only", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await clearDrafts(page);
  await page.goto("/admin/#/c/resources/0");
  const desc = page.getByLabel("Short description");
  const original = await desc.inputValue();
  await desc.fill(`${original} [prod draft check]`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("#toast")).toContainText("Draft saved");
  await page.reload();
  await expect(page.getByLabel("Short description")).toHaveValue(/\[prod draft check\]/);
  await page.getByRole("button", { name: "Preview on website" }).click();
  await expect(page.frameLocator("#preview-frame").getByText("[prod draft check]")).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.goto("/admin/#/publish");
  await expect(page.locator(".change-list")).toContainText("O*NET Interest Profiler");
  await page.getByRole("button", { name: "Discard all unpublished changes" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard everything" }).click();
  await expect(page.getByText("nothing waiting to be published")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("production: account without a role is turned away @prod @prod-only", async ({ page }) => {
  await signIn(page, "norole");
  await expect(page.locator("#auth-message")).toContainText("doesn't have access");
});
