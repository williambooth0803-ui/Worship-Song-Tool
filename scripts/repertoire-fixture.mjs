import { reveal } from "./disclosure.mjs";
import assert from "node:assert/strict";
import { songCollections, collectionSongs } from "../public/collections.js";
const modernCount = collectionSongs(songCollections.find(c => c.id === "modern-hymns"), "all").length;
export async function checkRepertoireFlows(browser, base) {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page
    .getByRole("searchbox", { name: "Search songs", exact: true })
    .fill("Oceans");
  await page
    .locator(".catalog-matches")
    .getByRole("button", { name: "Open record", exact: true })
    .click();
  assert.equal(
    await page.locator(".detail-panel h2").textContent(),
    "Oceans (Where Feet May Fail)",
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Collections", exact: true })
    .click();
  assert.equal(await page.locator(".collection-row").count(), songCollections.length);
  await page
    .getByLabel("Collection depth", { exact: true })
    .selectOption("all");
  const modern = page.locator(".collection-row").filter({
    has: page.getByRole("heading", { name: "Modern hymns", exact: true }),
  });
  assert.equal(
    await modern.locator(".collection-count strong").textContent(),
    String(modernCount),
  );
  await modern
    .getByRole("button", { name: "Preview & import", exact: true })
    .click();
  await page
    .getByLabel("Import depth", { exact: true })
    .selectOption("essentials");
  assert.equal(await page.locator(".import-song input").count(), 12);
  await page.getByLabel("Import depth", { exact: true }).selectOption("all");
  assert.equal(await page.locator(".import-song input").count(), modernCount);
  await page
    .getByLabel("New library name", { exact: true })
    .fill("Modern hymns for my church");
  await reveal(page, "button", { name: "Import selected songs", exact: true });
  await page
    .getByRole("button", { name: "Import selected songs", exact: true })
    .click();
  assert.equal(await page.locator(".song-card").count(), 24);
  assert.match(
    await page.locator(".song-list .pagination").textContent(),
    new RegExp(`of ${modernCount}(?!\\d)`),
  );
  await reveal(page, "button", { name: "Rename", exact: true });
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page
    .getByLabel("Library name", { exact: true })
    .fill("Reviewed modern hymn candidates");
  await reveal(page, "button", { name: "Save library name", exact: true });
  await page
    .getByRole("button", { name: "Save library name", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search songs", exact: true })
    .fill("In Christ Alone");
  await reveal(page, "button", { name: "Add arrangement", exact: true });
  await page
    .getByRole("button", { name: "Add arrangement", exact: true })
    .click();
  const arrangement = page.locator("#arrangement-form");
  await arrangement
    .getByLabel("Arrangement name", { exact: true })
    .fill("Acoustic congregational version");
  await arrangement.getByLabel("Arrangement key", { exact: true }).fill("D");
  await arrangement
    .getByLabel("Arrangement duration (minutes)", { exact: true })
    .fill("3.5");
  await arrangement.getByLabel("Lowest vocal note", { exact: true }).fill("C4");
  await arrangement
    .getByLabel("Highest vocal note", { exact: true })
    .fill("E5");
  await arrangement
    .getByLabel("Largest vocal jump (semitones)", { exact: true })
    .fill("7");
  await arrangement
    .getByLabel("Wordless vocals (seconds)", { exact: true })
    .fill("0");
  await arrangement
    .getByLabel("Instrumentals (seconds)", { exact: true })
    .fill("15");
  await arrangement
    .getByRole("button", { name: "Save arrangement", exact: true })
    .click();
  await page
    .getByText("Acoustic congregational version", { exact: true })
    .waitFor();
  assert.ok(
    (await page.locator(".arrangement-section").textContent()).includes(
      "16 semitones",
    ),
  );
  await reveal(page, "button", { name: "Edit index details", exact: true });
  await page
    .getByRole("button", { name: "Edit index details", exact: true })
    .click();
  await page.locator(".index-lyrics summary").click();
  await page
    .getByLabel("Song words", { exact: true })
    .fill("We just sing truth\nOh, oh\nWe just sing truth");
  await reveal(page, "button", { name: "Save index details", exact: true });
  await page
    .getByRole("button", { name: "Save index details", exact: true })
    .click();
  assert.ok(
    (await page.locator(".text-statistics").textContent()).includes(
      "Interior “just”2",
    ),
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Song index", exact: true })
    .click();
  assert.equal(
    await page.locator(".index-table tbody tr").count(),
    50,
    "large indexes render one page",
  );
  assert.ok(
    await page.getByRole("button", { name: "Next", exact: true }).isEnabled(),
  );
  await reveal(page, "combobox", { name: "Index field", exact: true });
  const filter = page.locator("#index-filter-form");
  await filter
    .getByLabel("Index field", { exact: true })
    .selectOption("rangeSpan");
  await filter.getByLabel("Index value", { exact: true }).fill("12");
  await filter.getByRole("button", { name: "Add filter", exact: true }).click();
  assert.equal(await page.locator(".index-table tbody tr").count(), 1);
  await reveal(page, "button", { name: "In Christ Alone", exact: true });
  await page
    .getByRole("button", { name: "In Christ Alone", exact: true })
    .click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Worship plans", exact: true })
    .click();
  await reveal(page, "button", { name: "+ New worship plan", exact: true });
  await page
    .getByRole("button", { name: "+ New worship plan", exact: true })
    .click();
  await page
    .getByLabel("Service name", { exact: true })
    .fill("Sunday human-built outline");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-11");
  await page
    .getByLabel("Service status", { exact: true })
    .selectOption("completed");
  await reveal(page, "button", { name: "Create plan", exact: true });
  await page.getByRole("button", { name: "Create plan", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Song libraries", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search songs", exact: true })
    .fill("In Christ Alone");
  await reveal(page, "button", { name: "Add to plan", exact: false });
  await page.getByRole("button", { name: "Add to plan", exact: false }).click();
  const add = page.locator("#add-to-plan-form");
  assert.equal(
    await add.locator('[name="role"]').inputValue(),
    "",
    "the planner must not choose a service role",
  );
  assert.equal(await add.locator('[name="key"]').inputValue(), "D");
  await add.getByRole("button", { name: "Add to plan", exact: true }).click();
  assert.ok(
    (await page.locator(".service-items").textContent()).includes(
      "Acoustic congregational version",
    ),
  );
  await reveal(page, "button", { name: "Duplicate plan", exact: true });
  await page
    .getByRole("button", { name: "Duplicate plan", exact: true })
    .click();
  await page
    .getByLabel("Service name", { exact: true })
    .fill("Next Sunday draft");
  await reveal(page, "button", { name: "Create copy", exact: true });
  await page.getByRole("button", { name: "Create copy", exact: true }).click();
  assert.equal(await page.locator(".plan-state").textContent(), "draft");
  await reveal(page, "button", { name: "Edit In Christ Alone", exact: true });
  await page
    .getByRole("button", { name: "Edit In Christ Alone", exact: true })
    .click();
  await page
    .locator('#item-form [name="notes"]')
    .fill("Only this copied plan changes.");
  await reveal(page, "button", { name: "Save item", exact: true });
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await page
      .locator(".plan-list")
      .evaluate((el) => getComputedStyle(el).display),
    "none",
  );
  assert.equal(
    await page
      .locator(".item-buttons")
      .evaluate((el) => getComputedStyle(el).display),
    "none",
  );
  await page.pdf({
    path: "/tmp/faithful-repertoire-service.pdf",
    format: "Letter",
  });
  await page.emulateMedia({ media: "screen" });
  await page
    .locator(".plan-list")
    .getByRole("button", { name: /Sunday human-built outline/ })
    .click();
  assert.ok(
    !(await page.locator(".service-items").textContent()).includes(
      "Only this copied plan changes.",
    ),
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Song libraries", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search songs", exact: true })
    .fill("In Christ Alone");
  await page.locator('[data-attribute="usage"] > summary').click();
  assert.ok(
    (
      await page
        .getByRole("heading", { name: "Use in your services", exact: true })
        .locator("..")
        .textContent()
    ).includes("1 marked completed"),
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Collections", exact: true })
    .click();
  await reveal(page, "button", { name: "Import your song list", exact: true });
  await page
    .getByRole("button", { name: "Import your song list", exact: true })
    .click();
  await page.getByLabel("Song list CSV", { exact: true }).setInputFiles({
    name: "church.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Title,Attribution,Preferred Key\nMy original chorus,Our church,C",
    ),
  });
  await reveal(page, "button", { name: "Preview song list", exact: true });
  await page
    .getByRole("button", { name: "Preview song list", exact: true })
    .click();
  await page
    .getByLabel("New library name", { exact: true })
    .fill("Our own songs");
  await reveal(page, "button", { name: "Import selected songs", exact: true });
  await page
    .getByRole("button", { name: "Import selected songs", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "My original chorus", exact: true, level: 2 })
    .waitFor();
  await reveal(page, "button", { name: "Delete library", exact: true });
  await page
    .getByRole("button", { name: "Delete library", exact: true })
    .click();
  await reveal(page, "button", { name: "Delete this library", exact: true });
  await page
    .getByRole("button", { name: "Delete this library", exact: true })
    .click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hymn-heart-v1")),
  );
  assert.ok(
    stored.songs.some((s) => s.title === "My original chorus"),
    "deleting a library must preserve song records",
  );
  assert.equal(stored.plans.length, 2);
  assert.notEqual(stored.plans[0].items[0].id, stored.plans[1].items[0].id);
  await page
    .locator("nav")
    .getByRole("button", { name: "Collections", exact: true })
    .click();
  await page.screenshot({
    path: "/tmp/faithful-repertoire-collections.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.equal(await page.locator("nav .nav-item").count(), 6);
  await page.screenshot({
    path: "/tmp/faithful-repertoire-collections-mobile.png",
    fullPage: true,
  });
  await page.reload();
  const reloaded = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hymn-heart-v1")),
  );
  assert.ok(
    reloaded.songs.find((s) => s.title === "In Christ Alone").arrangements
      ?.length,
  );
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "PASS: collection depth previews/imports, CSV, library management, arrangements, objective text counts, pagination, completed-use history, independent plan copies, print/PDF and mobile layout.",
  );
}
