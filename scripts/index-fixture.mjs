import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
export async function checkIndexFlows(browser, base) {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const html = (
    await readFile(new URL("../docs/index.html", import.meta.url), "utf8")
  ).replace(' data-edition="static"', "");
  await page.route(base, (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { aiConfigured: true } }),
  );
  let aiRequests = 0;
  await page.route("**/api/index-match", (route) => {
    aiRequests++;
    const body = route.request().postDataJSON();
    assert.equal(body.aiMode, "full");
    assert.equal(body.songs.length, 1);
    assert.equal(body.songs[0].title, "Amazing Grace");
    return route.fulfill({
      json: {
        model: "Fixture only",
        generatedAt: new Date().toISOString(),
        results: [
          {
            id: body.songs[0].id,
            fit: "possible",
            reason: "The supplied excerpt mentions trust.",
            evidence: ["Grace that teaches us to trust."],
          },
        ],
      },
    });
  });
  await page.goto(base);
  await page
    .locator("nav")
    .getByRole("button", { name: "Song index", exact: true })
    .click();
  assert.equal(await page.locator(".index-table tbody tr").count(), 40);
  await page
    .getByRole("button", {
      name: "Edit index details for Amazing Grace",
      exact: true,
    })
    .click();
  const form = page.locator("#index-details-form");
  await form
    .getByLabel("Themes, separated by commas", { exact: true })
    .fill("Grace, Assurance");
  await form.getByLabel("Tune", { exact: true }).fill("NEW BRITAIN");
  await form.getByLabel("Tempo (BPM)", { exact: true }).fill("88");
  await form.locator("summary").click();
  await form
    .getByLabel("Song words", { exact: true })
    .fill("Grace that teaches us to trust.");
  await form.getByLabel("Metric name", { exact: true }).fill("Hymnal number");
  await form.getByLabel("Metric type", { exact: true }).selectOption("number");
  await form.getByLabel("Metric value", { exact: true }).fill("123");
  await form
    .getByRole("button", { name: "Save index details", exact: true })
    .click();
  await page
    .getByLabel("Additional column", { exact: true })
    .selectOption("custom:hymnal number");
  assert.ok((await page.locator(".index-table").textContent()).includes("123"));
  await page.locator(".index-directory summary").click();
  await page.getByLabel("Find a value", { exact: true }).fill("trust");
  await page.getByRole("button", { name: "Find values", exact: true }).click();
  await page
    .locator(".index-entry-list button")
    .filter({ hasText: "trust" })
    .click();
  assert.equal(await page.locator(".index-table tbody tr").count(), 1);
  const filter = page.locator("#index-filter-form");
  await filter.getByLabel("Index field", { exact: true }).selectOption("tempo");
  await filter.getByLabel("Index match", { exact: true }).selectOption("lte");
  await filter.getByLabel("Index value", { exact: true }).fill("90");
  await filter.getByRole("button", { name: "Add filter", exact: true }).click();
  assert.equal(await page.locator(".index-table tbody tr").count(), 1);
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export results (CSV)", exact: true })
    .click();
  const download = await downloading,
    stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  assert.ok(csv.includes("Hymnal number"));
  assert.ok(csv.includes("Grace that teaches us to trust."));
  await page
    .getByRole("button", { name: "Amazing Grace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Save to library", exact: true })
    .click();
  await page.locator('#save-song-form input[value="personal"]').check();
  await page.locator("#save-song-form button.primary").click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Song index", exact: true })
    .click();
  const before = await page.evaluate(() =>
    localStorage.getItem("hymn-heart-v1"),
  );
  await page
    .getByRole("button", { name: "AI criteria search · optional", exact: true })
    .click();
  await page
    .getByLabel("Your criterion", { exact: true })
    .fill("Songs expressing trust.");
  await page
    .getByRole("button", { name: "Search with AI", exact: true })
    .click();
  await page.getByText("Possible match", { exact: true }).waitFor();
  assert.equal(aiRequests, 1);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("hymn-heart-v1")),
    before,
    "AI lookup must not modify plans or reviews",
  );
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await page.getByRole("button", { name: "Reset index", exact: true }).click();
  await page.screenshot({
    path: "/tmp/faithful-repertoire-index.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page
      .locator("nav .nav-item")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 10),
    "mobile navigation must retain readable labels",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile index table must scroll inside its region",
  );
  await page.screenshot({
    path: "/tmp/faithful-repertoire-index-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .locator("nav")
    .getByRole("button", { name: "Song index", exact: true })
    .click();
  await page
    .getByLabel("Additional column", { exact: true })
    .selectOption("tempo");
  assert.ok((await page.locator(".index-table").textContent()).includes("88"));
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "PASS: index details, word concordance, combined metrics, CSV, reload, mobile layout and explicit fixture AI library lookup without workspace changes.",
  );
}
