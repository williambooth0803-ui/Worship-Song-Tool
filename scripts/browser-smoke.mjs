import {navigate} from "./disclosure.mjs";
import { reveal, keepAIIfOffered } from "./disclosure.mjs";
import { catalogSongs } from "../public/catalog.js";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import http from "node:http";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
// These regression workflows intentionally exercise the preserved browser workspace.
const originalNewPage = browser.newPage.bind(browser);
browser.newPage = async options => {
  const page = await originalNewPage(options);
  await page.addInitScript(() => sessionStorage.setItem("faithful-guest-opt-in", "1"));
  return page;
};

const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(process.env.APP_URL || "http://127.0.0.1:3000");
await page.getByRole("heading", { name: "Discover songs" }).waitFor();
await page.screenshot({ path: "/tmp/worship-discover.png", fullPage: true });
await reveal(page, "button", { name: "Plans", exact: false });
await page.getByRole("button", { name: "Plans", exact: false }).click();
await reveal(page, "button", { name: "+ New plan" });
await page.getByRole("button", { name: "+ New plan" }).click();
await page.getByLabel("Plan name").fill("Sunday · Grace and assurance");
await page.getByLabel("Date", { exact: true }).fill("2026-10-18");
await page.getByLabel("Theme", { exact: true }).fill("Salvation by grace");
await page.getByLabel("Sermon passage").fill("Ephesians 2:1–10");
await reveal(page, "button", { name: "Create plan", exact: true });
await page.getByRole("button", { name: "Create plan", exact: true }).click();

await navigate(page,"discover");
await page.getByRole("searchbox").fill("amazing grace");
await reveal(page, "button", { name: "Edit evaluation" });
await page.getByRole("button", { name: "Edit evaluation" }).click();
await page
  .getByRole("spinbutton", { name: "Arrangement coherence", exact: true })
  .fill("8");
await page
  .getByLabel("Your notes", { exact: true })
  .fill("Use three verses; acoustic arrangement. Teach grace before singing.");
await page.getByLabel("Preferred key").fill("D");
await page.getByLabel("Planning duration (minutes)").fill("3.5");
await reveal(page, "button", { name: "Save evaluation", exact: true });
await page
  .getByRole("button", { name: "Save evaluation", exact: true })
  .click();
  await keepAIIfOffered(page);
await reveal(page, "button", { name: "Add to library" });
await page.getByRole("button", { name: "Add to library" }).click();
await page.getByLabel("My repertoire", { exact: true }).check();
await page.getByLabel("Needs evaluation", { exact: true }).check();
await reveal(page, "button", { name: "Save library choices" });
await page.getByRole("button", { name: "Save library choices" }).click();
await reveal(page, "button", { name: "Add to plan" });
await page.getByRole("button", { name: "Add to plan" }).click();
await page
  .locator("#add-to-plan-form")
  .getByRole("button", { name: "Add to plan" })
  .click();
await reveal(page, "button", { name: "Add item" });
await page
  .getByRole("button", { name: "Add item" })
  .click();
await page.getByLabel("Item title").fill("Scripture reading");
await page.getByLabel("Duration (minutes)").fill("2");
await page
  .getByLabel("Notes")
  .fill("Ephesians 2:1–10");
await reveal(page, "button", { name: "Save item", exact: true });
await page.getByRole("button", { name: "Save item", exact: true }).click();
await reveal(page, "button", {
  name: "Move Scripture reading up",
  exact: true,
});
await page
  .getByRole("button", { name: "Move Scripture reading up", exact: true })
  .click();
assert.equal(
  await page.locator(".service-items li").first().locator("h3").textContent(),
  "Scripture reading",
);
assert.equal(await page.locator(".duration-total strong").textContent(), "5.5");
await page.screenshot({ path: "/tmp/worship-plan.png", fullPage: true });
await page.reload();
await reveal(page, "button", { name: "Plans", exact: false });
await page.getByRole("button", { name: "Plans", exact: false }).click();
assert.equal(await page.locator(".service-items li").count(), 2);
assert.equal(await page.locator(".duration-total strong").textContent(), "5.5");
await reveal(page, "button", { name: "Libraries", exact: false });
await page
  .getByRole("button", { name: "Libraries", exact: false })
  .click();
assert.equal(
  await page.locator(".song-card h3").textContent(),
  "Amazing Grace",
);
assert.match(await page.locator(".notes-text").textContent(), /Teach grace/);
await reveal(page, "button", { name: "+ New library" });
await page.getByRole("button", { name: "+ New library" }).click();
await page.getByLabel("Library name").fill("Church approved");
await reveal(page, "button", { name: "Create library" });
await page.getByRole("button", { name: "Create library" }).click();
await navigate(page,"discover");
await reveal(page, "button", { name: "+ Add a song", exact: true });
await page.getByRole("button", { name: "+ Add a song", exact: true }).click();
await page
  .getByLabel("Song title")
  .fill("A new song <script>alert(1)</script>");
await page.getByLabel("Writer / attribution").fill("Test writer");
await page.getByLabel("Version / arrangement").fill("Test arrangement");
await page.getByLabel("Themes, separated by commas").fill("Grace, Hope");
await reveal(page, "button", { name: "Add song", exact: true });
await page.getByRole("button", { name: "Add song", exact: true }).click();
assert.match(await page.locator(".detail-panel h2").textContent(), /<script>/);
assert.equal(await page.locator(".detail-panel script").count(), 0);
await navigate(page,"profile");
await page
  .getByRole("spinbutton", { name: "Doctrinal accuracy weight", exact: true })
  .fill("50");
await reveal(page, "button", { name: "Save evaluation criteria" });
await page.getByRole("button", { name: "Save evaluation criteria" }).click();
const saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("hymn-heart-v1")),
);
assert.equal(saved.profile.weights.accuracy, 50);
assert.equal(saved.libraries.length, 3);
assert.equal(saved.libraries[0].songIds.length, 1);
assert.equal(saved.songs.length, catalogSongs.length + 1);
assert.equal(
  saved.songs.find((s) => s.id === "amazing-grace").review.status,
  "manual",
);
assert.equal(
  saved.songs.find((s) => s.id === "amazing-grace").review.scores.time,
  8,
);
assert.equal(
  typeof saved.songs.find((s) => s.id === "amazing-grace").review.time,
  "string",
);
assert.ok(saved.songs.find((s) => s.id === "amazing-grace").review.previous);
await page.route("**/api/status", (route) =>
  route.fulfill({ json: { aiConfigured: true } }),
);
await page.route("**/api/analyze", async (route) => {
  const request = route.request().postDataJSON();
  assert.match(request.profile, /Reformed/);
  assert.equal(
    request.lyrics,
    "Test evidence supplied for the browser fixture.",
  );
  await route.fulfill({
    json: {
      review: {
        scores: { accuracy: 8, substance: 7, language: 8, time: null },
        summary: "Browser fixture draft, not a real provider review.",
        claims: ["Fixture claim"],
        concerns: [],
        uses: ["Response"],
        scriptures: ["Ephesians 2:8 — thematic connection"],
        themes: ["Grace"],
        language: "Fixture language assessment.",
        time: "Not assessed.",
        concern: "none",
      },
      model: "test-fixture",
      generatedAt: new Date().toISOString(),
    },
  });
});
await page.reload();
await page.getByRole("searchbox").fill("amazing grace");
await reveal(page, "button", { name: "Draft with AI" });
await page.getByRole("button", { name: "Draft with AI" }).click();
await page
  .getByLabel("Song text you have permission to use")
  .fill("Test evidence supplied for the browser fixture.");
await reveal(page, "button", { name: "Generate draft", exact: true });
await page.getByRole("button", { name: "Generate draft", exact: true }).click();
await reveal(page, "button", { name: "Apply draft" });
await page.getByRole("button", { name: "Apply draft" }).click();
const drafted = await page.evaluate(
  () =>
    JSON.parse(localStorage.getItem("hymn-heart-v1")).songs.find(
      (s) => s.id === "amazing-grace",
    ),
);
assert.equal(drafted.review.status, "manual");
assert.equal(drafted.aiReview.status, "ai");
assert.match(drafted.review.notes, /Teach grace/);
assert.equal(drafted.review.key, "D");
assert.equal(drafted.aiReview.scores.time, null);
await page.getByRole("searchbox").fill("holy holy");
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/worship-mobile.png", fullPage: true });
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
const embedded = await browser.newPage();
const previewHost = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    `<html><body><iframe title="App preview" src="${process.env.APP_URL || "http://127.0.0.1:3000"}" style="width:1000px;height:800px"></iframe></body></html>`,
  );
});
await new Promise((resolve) => previewHost.listen(0, "127.0.0.1", resolve));
await embedded.goto(`http://127.0.0.1:${previewHost.address().port}/`);
await embedded
  .frameLocator("iframe")
  .getByRole("heading", { name: "Discover songs" })
  .waitFor();
await new Promise((resolve) => previewHost.close(resolve));
assert.deepEqual(errors, []);
console.log(
  "PASS: review edits, multi-library save, planning, reordering, duration totals, reload persistence, custom songs, HTML escaping, profile edits, mocked AI draft application, mobile overflow and cross-origin embedded preview.",
);
await browser.close();
