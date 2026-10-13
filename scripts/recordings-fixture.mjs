import assert from "node:assert/strict";
import { reveal } from "./disclosure.mjs";

export async function checkRecordingsFlows(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on("pageerror", err => errors.push(err.message));
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("hymn-heart-v1")));
  const youtube = "https://www.youtube.com/watch?v=abcdefghijk";
  const acoustic = "https://www.youtube.com/watch?v=lmnopqrstuv";
  const spotify = "https://open.spotify.com/track/0123456789012345678901";
  try {
    await page.goto(base);
    const id = (await state()).songs[0].id;
    assert.equal(await page.locator('.detail-panel [data-recording-kind="search"]').count(), 3);
    await reveal(page, "button", { name: "Manage recording links", exact: true });
    await page.getByRole("button", { name: "Manage recording links", exact: true }).click();
    const save = async (provider, url, label) => {
      await page.getByLabel("Recording platform").selectOption(provider);
      await page.getByLabel("Recording link", { exact: true }).fill(url);
      await page.getByLabel("Version label", { exact: true }).fill(label);
      await page.getByRole("button", { name: "Save recording link", exact: true }).click();
    };
    await save("youtube", youtube, "Album <script>unsafe()</script>");
    await page.locator(".saved-recordings a").getByText("Album <script>unsafe()</script>", {exact: true}).waitFor();
    assert.equal(await page.locator(".saved-recordings script").count(), 0);
    const before = await state();
    await save("spotify", youtube, "Wrong platform");
    await page.getByRole("alert").filter({hasText:"Use a full HTTPS Spotify"}).waitFor();
    assert.deepEqual(await state(), before);
    await save("youtube", youtube + "&si=tracking", "Duplicate");
    await page.getByRole("alert").filter({hasText:"already saved"}).waitFor();
    assert.deepEqual(await state(), before);
    await save("youtube", acoustic, "Acoustic version");
    await save("spotify", spotify, "Album version");
    await save("appleMusic", "https://music.apple.com/us/song/example/123456", "Apple album version");
    await page.locator(".saved-recordings li").filter({has:page.getByRole("link", {name:"Acoustic version",exact:true})}).getByRole("button",{name:"Make preferred",exact:true}).click();
    assert.equal((await state()).songs.find(s => s.id === id).recordings[0].url, acoustic);
    assert.equal(await page.locator('dialog [data-recording-kind="search"]').count(), 3, "Saved versions still allow alternate searches");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    const saved = page.locator('.detail-panel [data-recording-kind="saved"]');
    assert.equal(await saved.count(), 3);
    assert.equal(await saved.filter({hasText:"YouTube"}).getAttribute("href"), acoustic);
    assert.equal(await saved.filter({hasText:"Spotify"}).getAttribute("href"), spotify);
    await page.setViewportSize({width:390,height:844});
    await reveal(page, "button", { name: "Manage recording links", exact: true });
    await page.getByRole("button", { name: "Manage recording links", exact: true }).click();
    await page.locator(".saved-recordings li").filter({has:page.getByRole("link",{name:"Album version",exact:true})}).getByRole("button",{name:"Remove link",exact:true}).click();
    assert.equal((await state()).songs.find(s => s.id === id).recordings.length, 3);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:"/tmp/faithful-recordings-mobile.png",fullPage:true});
    await page.getByRole("button", { name: "Close", exact: true }).click();
    assert.equal(await page.locator('.detail-panel [data-provider="spotify"]').getAttribute("data-recording-kind"), "search");
    assert.deepEqual(errors, []);
    console.log("PASS: provider searches, validated recording save, duplicate rejection, preferred versions, reload persistence, removal and mobile controls.");
  } finally { await page.close(); }
}
