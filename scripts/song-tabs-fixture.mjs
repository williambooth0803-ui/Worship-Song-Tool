import assert from "node:assert/strict";
import { reveal } from "./disclosure.mjs";

export async function checkSongTabsFlows(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const workspace = () => page.evaluate(() => JSON.parse(localStorage.getItem("hymn-heart-v1")));
  try {
    await page.goto(base);
    await page.getByRole("heading", { name: "Discover songs", exact: true }).waitFor();
    const original = await workspace();
    const initialSongId=await page.locator(".detail-panel").getAttribute("data-song-id");
    const tab = name => page.getByRole("tab", { name, exact: true });
    assert.equal(await page.getByRole("tab").count(), 3);
    assert.equal(await page.getByRole("tabpanel").count(), 1);
    assert.equal(await tab("Details & files").getAttribute("aria-selected"), "true");
    assert.equal(await page.getByRole("button", { name: "Add to library", exact: true }).isVisible(), true);
    assert.equal(await page.getByRole("button", { name: "Blacklist song", exact: true }).isVisible(), false);
    assert.equal(await page.getByRole("link", { name: "Find lyrics ↗", exact: true }).count(), 0);
    await page.screenshot({ path: "/tmp/faithful-song-details-desktop.png" });

    await tab("Details & files").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await tab("Outside links").getAttribute("aria-selected"), "true");
    assert.equal(await page.getByRole("tabpanel").count(), 1);
    assert.ok(await page.getByRole("link", { name: "Find lyrics ↗", exact: true }).isVisible());
    assert.equal(await page.locator('.external-recordings [data-provider]').count(), 3);
    await page.screenshot({ path: "/tmp/faithful-song-links-desktop.png" });
    await page.keyboard.press("ArrowRight");
    assert.equal(await tab("Evaluation").getAttribute("aria-selected"), "true");
    assert.equal(await page.getByRole("button", { name: "Review decision", exact: true }).count(),0);
    assert.ok(await page.getByRole("button", { name: "Generate AI evaluation", exact: true }).isVisible());
    await page.screenshot({ path: "/tmp/faithful-song-evaluation-desktop.png" });
    await page.keyboard.press("Home");
    assert.equal(await tab("Details & files").getAttribute("aria-selected"), "true");
    await page.keyboard.press("End");
    assert.equal(await tab("Evaluation").getAttribute("aria-selected"), "true");
    assert.deepEqual(await workspace(), original, "Tabs cannot change song data or save a workspace");

    await page.getByRole("button", { name: "Add to library", exact: true }).click();
    await page.locator('#save-song-form input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: "Save library choices", exact: true }).click();
    assert.ok(await page.getByRole("button", { name: "Manage libraries", exact: true }).isVisible());
    assert.equal(await tab("Evaluation").getAttribute("aria-selected"), "true", "Edits preserve the active tab");

    // A real long personal note makes enough page height to verify wheel behavior.
    await page.evaluate(id => {
      const saved = JSON.parse(localStorage.getItem("hymn-heart-v1"));
      saved.songs.find(song=>song.id===id).review.notes = "A personal observation about this exact arrangement. ".repeat(100);
      localStorage.setItem("hymn-heart-v1", JSON.stringify(saved));
    },initialSongId);
    await page.reload();
    await page.locator('[data-attribute="notes"] > summary').click();
    assert.equal(await page.locator('.detail-panel').evaluate(el => getComputedStyle(el).overflowY), "visible");
    const note = page.locator('.notes-text');
    await note.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    const listBefore = await page.locator('.song-list').evaluate(el => el.scrollTop);
    const noteBox = await note.boundingBox();
    await page.mouse.move(noteBox.x + 30, Math.max(50, Math.min(800, noteBox.y + 50)));
    await page.mouse.wheel(0, 250);
    await page.waitForFunction(value => scrollY > value + 40, before);
    assert.equal(await page.locator('.detail-panel').evaluate(el => el.scrollTop), 0);
    assert.equal(await page.locator('.song-list').evaluate(el => el.scrollTop), listBefore);

    // Browse within results, then choose another song while its heading is offscreen.
    await page.locator('.song-list').evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
    const list = await page.locator('.song-list').boundingBox();
    const pageBeforeList = await page.evaluate(() => scrollY);
    await page.mouse.move(list.x + list.width / 2, Math.max(40, list.y + 80));
    const resultBeforeWheel = await page.locator('.song-list').evaluate(el => el.scrollTop);
    await page.mouse.wheel(0, 250);
    await page.waitForFunction(value => document.querySelector('.song-list').scrollTop > value + 40, resultBeforeWheel);
    assert.equal(await page.evaluate(() => scrollY), pageBeforeList);
    await page.locator('.song-list').evaluate(el => { el.scrollTop = el.scrollHeight; });
    // Leave room below in the document; reaching the page bottom cannot scroll further.
    await page.evaluate(() => scrollTo(0, Math.max(0, scrollY - 300)));
    const boundaryList = await page.locator('.song-list').boundingBox();
    await page.mouse.move(boundaryList.x + boundaryList.width / 2, Math.max(40, boundaryList.y + 80));
    const atBoundary = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 200);
    await page.waitForFunction(value => scrollY > value + 40, atBoundary);
    const last = page.locator('.song-card').last();
    await last.scrollIntoViewIfNeeded();
    const resultPosition = await page.locator('.song-list').evaluate(el => el.scrollTop);
    const title = await last.locator('h3').textContent();
    await last.click();
    assert.equal(await page.locator('.song-title h2').textContent(), title);
    const heading = await page.locator('.song-title h2').boundingBox();
    assert.ok(heading.y >= 0 && heading.y < 1000, "Selection brings the new song heading into view");
    assert.equal(await page.locator('.song-list').evaluate(el => el.scrollTop), resultPosition);

    await page.setViewportSize({ width: 390, height: 844 });
    await tab("Outside links").click();
    assert.equal(await page.getByRole("tabpanel").count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: "/tmp/faithful-song-tabs-mobile.png", fullPage: true });
    await reveal(page, "button", { name: "Blacklist song", exact: true });
    await page.getByRole("button", { name: "Blacklist song", exact: true }).click();
    await page.locator('.nav-item[data-view="blacklist"]').click();
    assert.ok(await page.getByRole("button", { name: "Restore song", exact: true }).isVisible());
    assert.equal(await page.locator('.detail-panel [data-action="save-song"]').count(), 0);
    assert.equal(await page.locator('.detail-panel [data-action="add-to-plan"]').count(), 0);
    await tab("Evaluation").click();
    assert.equal(await page.getByRole("button", { name: "Review decision", exact: true }).count(),0);
    assert.deepEqual(errors, []);
    console.log("PASS: song tabs, keyboard selection, unified links, library membership, natural detail/page wheel scrolling, retained result position, mobile layout and full isolated blacklist.");
  } finally { await page.close(); }
}
