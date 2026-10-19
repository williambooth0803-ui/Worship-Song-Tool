import {checkShortlistReviewFlows} from './shortlist-review-fixture.mjs';
import {checkLensFlows} from "./lenses-fixture.mjs";
import {checkCatalogAnalysisFlows} from "./catalog-analysis-fixture.mjs";
import {checkRebuildFlows} from "./rebuild-fixture.mjs";
import {navigate} from "./disclosure.mjs";
import {checkDiscoverResultsFlows} from "./discover-results-fixture.mjs";
import {checkWorkspaceEvaluationFlows} from "./workspace-evaluation-fixture.mjs";
import {checkSearchCollectionFlows,checkRememberAndSaveFlows} from "./search-collections-fixture.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { checkConnectionFlows } from "./connection-fixture.mjs";
import { checkNavigationFlows } from "./navigation-fixture.mjs";
import { checkPreferencesFlows } from "./preferences-fixture.mjs";
import { reveal, keepAIIfOffered, chooseSong } from "./disclosure.mjs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { checkAccountFlows } from "./account-fixture.mjs";
import { checkAccountStartupFlows } from "./startup-fixture.mjs";
import { checkOrganizationFlows } from "./organizations-fixture.mjs";
import { checkPlanningUpgradeFlows } from "./planning-upgrade-fixture.mjs";
import { checkSongTabsFlows } from "./song-tabs-fixture.mjs";
import { checkIndexFlows } from "./index-fixture.mjs";
import { checkRepertoireFlows } from "./repertoire-fixture.mjs";
import { catalogSongs } from "../public/catalog.js";
import { checkEvaluationFlows } from "./evaluation-fixture.mjs";
import { checkDiscoveryFlows } from "./discovery-fixture.mjs";
import { checkRecordingsFlows } from "./recordings-fixture.mjs";

const root = fileURLToPath(new URL("../docs/", import.meta.url));
const requests = [];
const server = http.createServer(async (req, res) => {
  requests.push(req.url);
  const requestPath = new URL(req.url, "http://localhost").pathname;
  const filename =
    requestPath === "/Worship-Song-Tool/"
      ? "index.html"
      : requestPath.slice("/Worship-Song-Tool/".length);
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
// These regression workflows intentionally exercise the preserved browser workspace.
const originalNewPage = browser.newPage.bind(browser);
browser.newPage = async options => {
  const page = await originalNewPage(options);
  await page.addInitScript(() => sessionStorage.setItem("faithful-guest-opt-in", "1"));
  // Keep ordinary regression tests deterministic and avoid live image-provider traffic.
  // The dedicated collection fixture installs its synthetic portrait responses afterwards.
  await page.route('https://www.wikidata.org/**',route=>route.fulfill({contentType:'application/json',body:'{"entities":{}}'}));
  await page.route('https://commons.wikimedia.org/**',route=>route.abort());
  await page.route('https://upload.wikimedia.org/**',route=>route.abort());
  await page.route('https://*.mzstatic.com/**',route=>route.abort());
  return page;
};

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await page.getByRole("heading", { name: "Discover songs" }).waitFor();
  assert.equal(await page.locator(".song-card").count(), 24);
  assert.match(
    await page.locator(".song-list .pagination").textContent(),
    new RegExp(`of ${catalogSongs.length}(?!\\d)`),
  );
  assert.equal(
    await page.locator("html").getAttribute("data-edition"),
    "static",
  );
  assert.ok(requests.includes("/Worship-Song-Tool/styles.css"));
  assert.ok(requests.includes("/Worship-Song-Tool/app.js"));
  assert.ok(!requests.some((url) => url.includes("/api/")));

  const originalSong=await page.evaluate(()=>JSON.parse(localStorage.getItem("hymn-heart-v1")).songs[0]);
  await chooseSong(page,originalSong);
  await reveal(page, "button", { name: "Edit evaluation" });
  await page.getByRole("button", { name: "Edit evaluation" }).click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Restore this personal note.");
  await reveal(page, "button", { name: "Save evaluation", exact: true });
  await page
    .getByRole("button", { name: "Save evaluation", exact: true })
    .click();
  await keepAIIfOffered(page);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hymn-heart-v1")),
  );
  await reveal(page, "button", { name: "Backup & restore" });
  await page.getByRole("button", { name: "Backup & restore" }).click();
  const downloading = page.waitForEvent("download");
  await reveal(page, "button", { name: "Download a backup", exact: true });
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
  await reveal(page, "button", { name: "Review backup", exact: true });
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
  await reveal(page, "button", { name: "Review backup", exact: true });
  await page
    .getByRole("button", { name: "Review backup", exact: true })
    .click();
  await reveal(page, "button", { name: "Cancel", exact: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("hymn-heart-v1")),
    ),
    before,
  );

  await reveal(page, "button", { name: "Backup & restore" });
  await page.getByRole("button", { name: "Backup & restore" }).click();
  await page.getByLabel("Backup file", { exact: true }).setInputFiles(file);
  await reveal(page, "button", { name: "Review backup", exact: true });
  await page
    .getByRole("button", { name: "Review backup", exact: true })
    .click();
  await reveal(page, "button", {
    name: "Replace with this backup",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await page.reload();
  await chooseSong(page,originalSong);
  assert.match(
    await page.locator(".notes-text").textContent(),
    /Restored from the other browser/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate(page,"settings");
  await page.getByText("Advanced account tools",{exact:true}).click();
  assert.ok(
    await page.getByRole("button", { name: "Backup & restore" }).isVisible(),
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.nav-item[data-view="discover"]').click();
  await reveal(page, "button", { name: "Build my profile" });
  await page.getByRole("button", { name: "Build my profile" }).click();
  await page
    .getByLabel("Denomination", { exact: true })
    .selectOption("lutheran");
  await reveal(page, "button", { name: "Continue", exact: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Statement of faith", { exact: true })
    .selectOption("augsburg");
  await reveal(page, "button", { name: "Continue", exact: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /Human evaluations only/ }).check();
  await reveal(page, "button", { name: "Save my profile" });
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
  await page.evaluate(() => {
    const saved=JSON.parse(localStorage.getItem("hymn-heart-v1"));
    saved.songs[0].approval={status:"context",notes:"Explain the hymn’s archaic language.",updatedAt:null};
    localStorage.setItem("hymn-heart-v1",JSON.stringify(saved));
  });
  await page.reload();
  await page.locator('.nav-item[data-view="library"]').click();
  await reveal(page,"button",{name:"Starter libraries",exact:true});
  await page.getByRole("button",{name:"Starter libraries",exact:true}).click();
  await page.locator("#migrate-decisions").check();
  await page.getByRole("button",{name:"Add starter libraries",exact:true}).click();
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem("hymn-heart-v1")));
  assert.ok(migrated.libraries.find(l=>l.name==="Use with context").songIds.includes(migrated.songs[0].id));
  assert.equal(migrated.songs[0].approval.notes,"Explain the hymn’s archaic language.");
  await page.locator('.nav-item[data-view="discover"]').click();
  assert.equal(await page.getByRole("button",{name:"Review decision",exact:true}).count(),0);
  assert.equal(await page.getByLabel("Church use",{exact:true}).count(),0);
  await reveal(page,"button",{name:"Edit evaluation",exact:true});
  await page.getByRole("button",{name:"Edit evaluation",exact:true}).click();
  await reveal(page,"button",{name:"Save evaluation",exact:true});
  await page.getByRole("button",{name:"Save evaluation",exact:true}).click();
  await keepAIIfOffered(page);
  const afterEvaluation=await page.evaluate(()=>JSON.parse(localStorage.getItem("hymn-heart-v1")));
  assert.deepEqual(afterEvaluation.libraries,migrated.libraries,"Evaluations do not reclassify libraries");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hymn-heart-v1"));
    const song = state.songs[0],
      human = structuredClone(song.review);
    delete human.previous;
    human.summary = "My human assessment is retained.";
    delete human.aiFields;
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
  await chooseSong(page,originalSong);
  await page
    .getByText("AI draft visibility fixture.", { exact: true })
    .waitFor({state:"attached"});
  for (const mode of ["manual", "limited", "full"]) {
    await navigate(page,"profile");
    await page
      .getByLabel("AI content preference", { exact: true })
      .selectOption(mode);
    await reveal(page, "button", { name: "Save evaluation criteria", exact: true });
    await page
      .getByRole("button", { name: "Save evaluation criteria", exact: true })
      .click();
    await navigate(page,"discover");
    await chooseSong(page,originalSong);
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
      () => JSON.parse(localStorage.getItem("hymn-heart-v1")).songs[0].aiReview,
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
  await checkSearchCollectionFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkRememberAndSaveFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkDiscoverResultsFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkWorkspaceEvaluationFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkPlanningUpgradeFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkOrganizationFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkSongTabsFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkPreferencesFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await checkCatalogAnalysisFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkShortlistReviewFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkLensFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkRebuildFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkNavigationFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await checkConnectionFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await checkAccountStartupFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkAccountFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await checkIndexFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await checkRepertoireFlows(
    browser,
    `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`,
  );
  await checkEvaluationFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkDiscoveryFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  await checkRecordingsFlows(browser, `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/`);
  const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL("./request-regression.mjs", import.meta.url))], {
    env: { ...process.env, APP_URL: `http://127.0.0.1:${server.address().port}/Worship-Song-Tool/` },
    timeout: 120000,
  });
  console.log(stdout.trim());

  console.log(
    "PASS: hosted subdirectory assets, static edition without API calls, backup download, invalid import rejection, cancel preservation, confirmed restore, reload and mobile controls.",
  );
} catch (error) {
  // Keep the actual browser failure readable through the Checks API even when
  // the runner's separate log-storage host cannot be reached.
  if (process.env.GITHUB_ACTIONS) {
    const message = String(error.stack || error).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=Hosted browser regression::${message}`);
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
