// Smoke tests for every public app — make sure the admin work broke nothing.
const { test, expect } = require("@playwright/test");

test("career roadmap: home → field page with pathway, certifications, links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Explore a STEM field" })).toBeVisible();
  expect(await page.locator(".field-card-link").count()).toBeGreaterThanOrEqual(12);
  await page.getByRole("link", { name: /Aerospace Engineering/ }).first().click();
  await expect(page.getByRole("heading", { name: /Aerospace Engineering/ })).toBeVisible();
  await expect(page.getByText(/Aerospace Engineer I/).first()).toBeVisible();
  const certLink = page.getByRole("link", { name: /Certified Systems Engineering Professional/ });
  await expect(certLink).toHaveAttribute("href", /^https:\/\//);
});

test("majors explorer links majors to fields", async ({ page }) => {
  await page.goto("/#/majors");
  await expect(page.getByRole("heading", { name: "Explore a STEM major" })).toBeVisible();
  await page.getByRole("link", { name: /Aerospace Engineering/ }).first().click();
  await expect(page.getByRole("link", { name: "Aerospace Engineering" }).last()).toBeVisible();
});

test("skills and resources pages render", async ({ page }) => {
  await page.goto("/#/skills");
  await expect(page.getByRole("heading", { name: "Developmental skills" })).toBeVisible();
  await expect(page.getByText("Toastmasters International")).toBeAttached();
  await page.goto("/#/resources");
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  await expect(page.getByRole("link", { name: /O\*NET Interest Profiler/ })).toBeVisible();
});

test("shortlist: bookmark an item, see it on My Shortlist", async ({ page }) => {
  await page.goto("/#/field/civil-engineering");
  await page.locator(".star-btn").first().click();
  await page.goto("/#/shortlist");
  await expect(page.getByRole("heading", { name: "My Shortlist" })).toBeVisible();
  await expect(page.locator(".star-btn.active").first()).toBeVisible();
});

test("interview prep: steps, STAR guide, question bank search", async ({ page }) => {
  await page.goto("/#/interview");
  await expect(page.getByRole("heading", { name: "STEM Interview Prep Guide" })).toBeVisible();
  await page.goto("/#/interview/3");
  await expect(page.getByRole("heading", { name: /The STAR Method/ })).toBeVisible();
  await page.goto("/#/interview/6");
  await expect(page.getByRole("heading", { name: /Question Bank/ })).toBeVisible();
  await expect(page.getByText("Tell me about yourself.").first()).toBeVisible();
  await page.goto("/#/interview/8");
  await expect(page.getByRole("heading", { name: /Video Practice/ })).toBeVisible();
});

test("worksheet generator creates a worksheet from notes", async ({ page }) => {
  await page.goto("/#/worksheet");
  await page.locator("#worksheet-title").fill("Photosynthesis");
  await page.locator("#worksheet-notes").fill(
    "Photosynthesis is the process plants use to convert light energy into chemical energy. " +
    "Chlorophyll absorbs light mostly in the blue and red wavelengths. The light-dependent reactions occur in the thylakoid membranes. " +
    "The Calvin cycle takes place in the stroma and fixes carbon dioxide into sugars. Oxygen is released as a byproduct of splitting water molecules."
  );
  await page.locator("#worksheet-generate-btn").click();
  await expect(page.locator("#worksheet-print-btn")).toBeVisible();
});

test("job finder filters listings and labels samples", async ({ page }) => {
  await page.goto("/jobs/");
  await expect(page.getByRole("heading", { name: "Find a STEM job" })).toBeVisible();
  await expect(page.locator("#jobs-count")).toHaveText("12 listings");
  await expect(page.getByText("Sample listing").first()).toBeVisible();
  await page.getByLabel("STEM field").selectOption({ label: "Computer Science / Software Engineering" });
  await expect(page.locator("#jobs-count")).toHaveText("2 listings");
  await page.getByLabel("Keyword").fill("zzzz-no-match");
  await expect(page.getByText("No listings match")).toBeVisible();
});

test("mobile navigation works without horizontal scrolling @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Explore a STEM field" })).toBeVisible();
  await page.getByRole("link", { name: "Majors" }).click();
  await expect(page.getByRole("heading", { name: "Explore a STEM major" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("no console errors on public pages", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  for (const url of ["/", "/#/majors", "/#/skills", "/#/interview", "/#/worksheet", "/#/resources", "/#/shortlist", "/jobs/"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});
