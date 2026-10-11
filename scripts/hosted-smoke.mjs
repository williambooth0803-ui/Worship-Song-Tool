import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { checkAccountFlows } from "./account-fixture.mjs";

const root = fileURLToPath(new URL("../docs/", import.meta.url));
const requests = [];
const server = http.createServer(async (req, res) => {
  requests.push(req.url);
  const filename =
    req.url === "/Worship-Song-Tool/"
      ? "index.html"
      : req.url.slice("/Worship-Song-Tool/".length);
  if (!req.url.startsWith("/Worship-Song-Tool/") || filename.includes("..")) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const body = await readFile(path.join(root, filename));
    res.writeHead(200, {
      "Content-Type": filename.endsWith(".js")
        ? "text/javascript"
        : filename.endsWith(".css")
          ? "text/css"
          : "text/html",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await page
    .getByRole("heading", { name: "Find words worth singing." })
    .waitFor();
  assert.equal(await page.locator(".song-card").count(), 20);
  assert.equal(
    await page.locator("html").getAttribute("data-edition"),
    "static",
  );
  assert.ok(requests.includes("/Worship-Song-Tool/styles.css"));
  assert.ok(requests.includes("/Worship-Song-Tool/app.js"));
  assert.ok(!requests.some((url) => url.includes("/api/")));

  await page.getByRole("button", { name: "Edit assessment" }).click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Restore this personal note.");
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hymn-heart-v1")),
  );
  await page.getByRole("button", { name: "Backup & restore" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download a backup", exact: true })
    .click();
  const download = await downloading;
  assert.deepEqual(
    JSON.parse(await readFile(await download.path(), "utf8")),
    before,
  );

  const invalid = { ...before, version: 99 };
  await page.getByLabel("Backup file", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await page
    .getByRole("button", { name: "Review backup", exact: true })
    .click();
  await page
    .getByText("Invalid backup: this backup version is not supported.", {
      exact: true,
    })
    .waitFor();
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hymn-heart-v1")),
    ),
    before,
  );

  const backup = structuredClone(before);
  backup.songs[0].review.notes = "Restored from the other browser.";
  const file = {
    name: "hymn-heart-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await page.getByLabel("Backup file", { exact: true }).setInputFiles(file);
  await page
    .getByRole("button", { name: "Review backup", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hymn-heart-v1")),
    ),
    before,
  );

  await page.getByRole("button", { name: "Backup & restore" }).click();
  await page.getByLabel("Backup file", { exact: true }).setInputFiles(file);
  await page
    .getByRole("button", { name: "Review backup", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await page.reload();
  assert.match(
    await page.locator(".notes-text").textContent(),
    /Restored from the other browser/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.getByRole("button", { name: "Backup & restore" }).isVisible(),
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Build my profile" }).click();
  await page
    .getByLabel("Denomination", { exact: true })
    .selectOption("lutheran");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Statement of faith", { exact: true })
    .selectOption("augsburg");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /Human reviews only/ }).check();
  await page.getByRole("button", { name: "Save my profile" }).click();
  const profile = await page.evaluate(
    () => JSON.parse(localStorage.getItem("hymn-heart-v1")).profile,
  );
  assert.equal(profile.denomination, "lutheran");
  assert.equal(profile.statement, "augsburg");
  assert.equal(profile.aiMode, "manual");
  assert.equal(
    await page.getByRole("button", { name: "Draft with AI" }).count(),
    0,
  );
  await page.getByRole("button", { name: "Review decision" }).click();
  await page
    .getByLabel("Church-use decision", { exact: true })
    .selectOption("context");
  await page
    .getByLabel("Reasoning or conditions for use")
    .fill("Explain the hymn’s archaic language.");
  await page
    .getByLabel("I have reviewed the exact version and any concerns.")
    .check();
  await page.getByRole("button", { name: "Save church-use decision" }).click();
  await page.getByLabel("Church use", { exact: true }).selectOption("context");
  assert.equal(await page.locator(".song-card").count(), 1);
  await page.getByRole("button", { name: "Edit assessment" }).click();
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  const edited = await page.evaluate(
    () => JSON.parse(localStorage.getItem("hymn-heart-v1")).songs[0],
  );
  assert.equal(edited.approval.status, "unreviewed");
  assert.ok(edited.approval.notes);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Review decision" }).click();
  await page
    .getByLabel("Church-use decision", { exact: true })
    .selectOption("avoid");
  await page
    .getByLabel("Reasoning or conditions for use")
    .fill("Testing a church-use restriction.");
  await page.getByRole("button", { name: "Save church-use decision" }).click();
  await page.getByRole("button", { name: "Add to plan" }).click();
  await page.locator("#approval-form").waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hymn-heart-v1"));
    const song = state.songs[0],
      human = structuredClone(song.review);
    delete human.previous;
    human.summary = "My human assessment is retained.";
    song.review = {
      ...song.review,
      status: "ai",
      summary: "AI draft visibility fixture.",
      previous: human,
      assistance: {
        summary: "AI observation visibility fixture.",
        language: "Fixture observation",
        time: "Not assessed.",
        model: "fixture",
        updatedAt: new Date().toISOString(),
      },
    };
    state.profile.aiMode = "full";
    localStorage.setItem("hymn-heart-v1", JSON.stringify(state));
  });
  await page.reload();
  await page
    .getByText("AI draft visibility fixture.", { exact: true })
    .waitFor();
  for (const mode of ["manual", "limited", "full"]) {
    await page
      .locator("nav")
      .getByRole("button", { name: "Rating profile" })
      .click();
    await page
      .getByLabel("AI content preference", { exact: true })
      .selectOption(mode);
    await page
      .getByRole("button", { name: "Save rating profile", exact: true })
      .click();
    await page
      .locator("nav")
      .getByRole("button", { name: "Discover songs" })
      .click();
    assert.equal(
      await page
        .getByText("AI draft visibility fixture.", { exact: true })
        .count(),
      mode === "full" ? 1 : 0,
    );
    assert.equal(
      await page
        .getByText("AI observation visibility fixture.", { exact: true })
        .count(),
      mode === "manual" ? 0 : 1,
    );
    const retained = await page.evaluate(
      () => JSON.parse(localStorage.getItem("hymn-heart-v1")).songs[0].review,
    );
    assert.equal(retained.summary, "AI draft visibility fixture.");
  }
  await page.screenshot({
    path: "/tmp/faithful-repertoire-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "/tmp/faithful-repertoire-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await checkAccountFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  console.log(
    "PASS: hosted subdirectory assets, static edition without API calls, backup download, invalid import rejection, cancel preservation, confirmed restore, reload and mobile controls.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
