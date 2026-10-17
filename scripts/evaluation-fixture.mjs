import assert from "node:assert/strict";
import { reveal, keepAIIfOffered } from "./disclosure.mjs";

export async function checkEvaluationFlows(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [], requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("hymn-heart-v1")));
  const mode = async value => {
    await page.evaluate(value => { const s = JSON.parse(localStorage.getItem("hymn-heart-v1")); s.profile.aiMode = value; localStorage.setItem("hymn-heart-v1", JSON.stringify(s)); }, value);
    await page.reload();
    await page.getByRole("searchbox", { name: "Search songs", exact: true }).fill("Christ Be Magnified");
  };
  try {
    await page.goto(base);
    const search = page.getByRole("searchbox", { name: "Search songs", exact: true });
    await search.fill("christ be magnifed");
    await page.getByRole("heading", { name: "No matching songs", exact: true }).waitFor();
    const closest = page.getByRole("region", { name: "Closest matches" });
    // aria-label on a section gives this a named region.
    await closest.getByRole("button", { name: /Christ Be Magnified/ }).click();
    assert.equal(await page.locator(".detail-panel h2").textContent(), "Christ Be Magnified");
    const id = await page.locator('[data-action="chatgpt-evaluation"]').getAttribute("data-id");
    await page.getByRole("tab",{name:"Outside links",exact:true}).click();
    for (const [name, suffix] of [["Find lyrics ↗", "lyrics"], ["Find public reviews ↗", "review"]]) {
      const link = page.getByRole("link", { name, exact: true });
      assert.match(new URL(await link.getAttribute("href")).searchParams.get("q"), /Christ Be Magnified.*Cody Carnes/);
      assert.ok((await link.getAttribute("href")).includes(suffix));
      assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
    }
    await reveal(page, "button", { name: "Edit evaluation", exact: true });
    await page.getByRole("button", { name: "Edit evaluation", exact: true }).click();
    await page.getByLabel("Your notes", { exact: true }).fill("Personal note to preserve");
    await reveal(page, "button", { name: "Save evaluation", exact: true });
    await page.getByRole("button", { name: "Save evaluation", exact: true }).click();
  await keepAIIfOffered(page);
    const before = await stored();
    await reveal(page,"button",{name:"Generate AI evaluation",exact:true});
    await page.getByRole("button", { name: "Generate AI evaluation", exact: true }).click();
    const prompt = await page.locator("#evaluation-prompt").inputValue();
    assert.ok(prompt.includes(id) && prompt.includes("faithful-evaluation-v1"));
    assert.ok(!prompt.includes("Personal note to preserve"));
    assert.equal(await page.locator('dialog a[href="https://chatgpt.com/"]').count(), 1);
    const value = { schema: "faithful-evaluation-v1", songId: id, aiMode: "full", review: { scores: { accuracy: 9, substance: 8, language: 8, time: null }, summary: "Verified preview fixture <img src=x onerror=alert(1)>", claims: ["A specific confession."], concerns: [], uses: [], scriptures: [], themes: ["Christ"], language: "Clear sentences.", time: "", concern: "none", sources: [{ url: "https://example.com/lyric-source", label: "Supplied test source" }] } };
    value.requestId = JSON.parse((await page.locator("#evaluation-prompt").inputValue()).match(/\{\n  "schema"[\s\S]*$/)[0]).requestId;
    await page.locator("#evaluation-json").fill(JSON.stringify({ ...value, songId: "different" }));
    await page.getByRole("button", { name: "Preview evaluation", exact: true }).click();
    assert.match(await page.locator("#evaluation-error").textContent(), /different song/);
    assert.equal(await page.locator("#apply-evaluation").count(), 0);
    await page.locator("#evaluation-json").fill(JSON.stringify(value));
    await page.getByRole("button", { name: "Preview evaluation", exact: true }).click();
    assert.equal(await page.locator("#evaluation-preview img").count(), 0);
    assert.equal(await page.locator("#evaluation-preview .ai-mark").count(), 1);
    assert.deepEqual(await stored(), before, "Preview cannot save a draft");
    // Editing the JSON invalidates the preview and its apply control.
    await page.locator("#evaluation-json").fill(JSON.stringify(value, null, 2));
    assert.equal(await page.locator("#apply-evaluation").count(), 0);
    await page.getByRole("button", { name: "Preview evaluation", exact: true }).click();
    await page.getByRole("button", { name: "Apply evaluation", exact: true }).click();
    const after = await stored(), s = after.songs.find(s => s.id === id);
    assert.equal(s.review.status, "manual"); assert.equal(s.review.notes, "Personal note to preserve");
    assert.equal(s.aiReview.status, "ai"); assert.equal(s.aiReview.scores.accuracy, 9);
    assert.deepEqual(s.review, before.songs.find(record => record.id === id).review);
    assert.equal(s.approval.status, "unreviewed");
    assert.deepEqual(after.libraries, before.libraries); assert.deepEqual(after.plans, before.plans);
    await mode("manual");
    assert.equal(await page.getByRole("button", { name: "Generate AI evaluation", exact: true }).count(), 0);
    assert.equal(await page.getByText(value.review.summary, { exact: true }).count(), 0);
    await mode("limited");
    const limitedBefore = await stored();
    await reveal(page,"button",{name:"Generate AI evaluation",exact:true});
    await page.getByRole("button", { name: "Generate AI evaluation", exact: true }).click();
    const limited = structuredClone(value); limited.aiMode = "limited"; limited.requestId = JSON.parse((await page.locator("#evaluation-prompt").inputValue()).match(/\{\n  "schema"[\s\S]*$/)[0]).requestId;
    limited.review = { ...limited.review, scores: { accuracy: null, substance: null, language: null, time: null }, summary: "Objective observations only.", claims: [], themes: [] };
    await page.locator("#evaluation-json").fill(JSON.stringify(limited));
    await page.getByRole("button", { name: "Preview evaluation", exact: true }).click();
    await page.getByRole("button", { name: "Save AI observations", exact: true }).click();
    const assisted = (await stored()).songs.find(s => s.id === id);
    assert.equal(assisted.review.assistance.summary, "Objective observations only.");
    const without = structuredClone(assisted.review); delete without.assistance;
    assert.deepEqual(without, limitedBefore.songs.find(s => s.id === id).review);
    assert.deepEqual(assisted.approval, limitedBefore.songs.find(s => s.id === id).approval);
    // Library search must not surface alternatives from somebody's whole catalog.
    await page.evaluate(id => { const s = JSON.parse(localStorage.getItem("hymn-heart-v1")); s.libraries[0].songIds = [id]; localStorage.setItem("hymn-heart-v1", JSON.stringify(s)); }, id);
    await page.reload();
    await page.locator('nav [data-view="library"]').click();
    await search.fill("christ be magnifed");
    await page.waitForFunction(()=>document.querySelector(".song-workspace")?.getAttribute("aria-busy")==="false");
    assert.equal(await page.locator(".closest-matches button").count(), 1);
    await search.fill("goodbye yesterdya");
    await page.waitForFunction(()=>document.querySelector(".song-workspace")?.getAttribute("aria-busy")==="false");
    assert.equal(await page.locator(".closest-matches button").count(), 0);
    await page.locator('nav [data-view="discover"]').click();
    await search.fill("all sufficent merit");
    await page.locator(".closest-matches").getByRole("button", { name: /All Sufficient Merit/ }).click();
    assert.equal(await page.locator(".detail-panel h2").textContent(), "All Sufficient Merit");
    assert.equal((await stored()).libraries[0].songIds.length, 1, "Opening a catalog record doesn't add it to a library");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await search.fill("qzxv qzxv qzxv");
    assert.equal(await page.locator(".closest-matches").count(), 0);
    assert.deepEqual(errors, []);
    assert.ok(!requests.some(url => /\/api\//.test(url)), "Static evaluation makes no API calls");
    console.log("PASS: typo alternatives, library scope, lyric/review links and ChatGPT evaluation preview, safe import, manual/limited modes and preserved personal data.");
  } finally { await page.close(); }
}
