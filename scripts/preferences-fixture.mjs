import assert from "node:assert/strict";
export async function checkPreferencesFlows(browser, base) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    await page.goto(base);
    assert.ok((await page.locator(".ai-mark").count()) > 0);
    assert.equal(
      await page.locator(".filter-panel").evaluate((n) => n.open),
      false,
    );
    assert.equal(
      await page.locator('[data-attribute="summary"]').evaluate((n) => n.open),
      true,
    );
    assert.equal(
      await page
        .getByText(
          "The songs you know, the notes you trust, the repertoire you’re building.",
          { exact: true },
        )
        .count(),
      0,
    );
    await page.locator(".topbar .more-menu > summary").click();
    await page
      .getByRole("button", { name: "AI Labels On", exact: true })
      .click();
    assert.equal(await page.locator(".ai-mark").count(), 0);
    await page.reload();
    assert.equal(await page.locator(".ai-mark").count(), 0);
    await page.locator(".topbar .more-menu > summary").click();
    await page
      .getByRole("button", { name: "AI Labels Off", exact: true })
      .click();
    assert.ok((await page.locator(".ai-mark").count()) > 0);
    await page
      .getByRole("button", { name: "Customize details", exact: true })
      .click();
    const form = page.locator("#detail-layout-form");
    await form.locator('input[value="themes"]').uncheck();
    await form
      .getByRole("button", { name: "Move Your notes up", exact: true })
      .click();
    await form
      .getByRole("button", { name: "Save details", exact: true })
      .click();
    assert.equal(await page.locator('[data-attribute="themes"]').count(), 0);
    await page.reload();
    assert.equal(await page.locator('[data-attribute="themes"]').count(), 0);
    await page
      .getByRole("searchbox", { name: "Search songs" })
      .fill("Forever (We Sing");
    await page
      .getByRole("heading", {
        name: "Forever (We Sing Hallelujah)",
        exact: true,
        level: 2,
      })
      .waitFor();
    await page.locator('[data-attribute="notes"] > summary').click();
    assert.match(
      await page.locator(".notes-text").textContent(),
      /work was finished on the cross/,
    );
    assert.equal(
      await page.locator('[data-attribute="notes"] .ai-mark').count(),
      0,
    );
    assert.equal(await page.locator('[data-attribute="musical"]').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  } finally {
    await page.close();
  }
  console.log(
    "PASS: collapsed controls, persistent AI-label toggle, hidden/reordered attributes, empty-field omission and personal Forever concern.",
  );
}
