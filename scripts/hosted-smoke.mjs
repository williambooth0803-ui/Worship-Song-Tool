import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";

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
  assert.equal(await page.locator(".song-card").count(), 4);
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
  await page
    .getByLabel("Backup file", { exact: true })
    .setInputFiles({
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
  assert.deepEqual(errors, []);
  console.log(
    "PASS: hosted subdirectory assets, static edition without API calls, backup download, invalid import rejection, cancel preservation, confirmed restore, reload and mobile controls.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
