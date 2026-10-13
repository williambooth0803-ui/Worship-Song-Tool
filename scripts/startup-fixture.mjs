import assert from "node:assert/strict";
import { syncCatalog } from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";

// Synthetic provider responses only; never reads or writes an owner's account.
export async function checkAccountStartupFlows(browser, base) {
  const user = { id: "00000000-0000-0000-0000-000000000071", email: "startup@example.test" };
  const session = { access_token: "fixture-startup", refresh_token: "fixture-refresh", user };
  const workspace = syncCatalog({ version: 1, songs: [], libraries: [{ id: "me", name: "My songs", songIds: [] }], plans: [], profile: { ...defaultProfile, setupComplete: true } });
  workspace.songs[0].review.notes = "Keep this personal startup note.";
  const store = `faithful-repertoire-user:${user.id}`;
  const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

  async function fixture(mode) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const gate = deferred(), requested = deferred();
    let ready = mode === "expired", refreshCalls = 0, writes = 0;
    const errors = [];
    await context.addInitScript(({ session, workspace, store }) => {
      if (sessionStorage.getItem("startup-fixture-seeded")) return;
      sessionStorage.setItem("startup-fixture-seeded", "1");
      localStorage.setItem("faithful-repertoire-session", JSON.stringify({ project: "https://fixture.supabase.co", session }));
      localStorage.setItem(store, JSON.stringify(workspace));
    }, { session, workspace, store });
    await context.route("**/config.js", route => route.fulfill({ contentType: "text/javascript", body: 'export const siteConfig = {supabaseUrl:"https://fixture.supabase.co",supabasePublishableKey:"sb_publishable_fixture_only"};' }));
    await context.route("https://fixture.supabase.co/**", async route => {
      const url = new URL(route.request().url());
      const answer = (value, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" }, body: status === 204 ? "" : JSON.stringify(value) });
      if (route.request().method() === "OPTIONS") return answer(null, 204);
      if (url.pathname.endsWith("/user")) {
        requested.resolve();
        if (mode === "expired" || (mode === "lock" && !ready)) return answer({ msg: "Expired fixture session" }, 401);
        if (!ready) await gate.promise;
        return answer(user);
      }
      if (url.pathname.endsWith("/token")) {
        refreshCalls++;
        return mode === "expired" ? answer({ message: "Invalid refresh token" }, 400) : answer(session);
      }
      if (route.request().method() !== "GET") {
        writes++;
        return answer([{ updated_at: "2026-10-13T12:00:00.000Z" }]);
      }
      return answer(url.pathname.endsWith("/profiles") ? [] : [{ workspace, updated_at: "2026-10-13T12:00:00.000Z" }]);
    });
    const page = await context.newPage();
    page.on("pageerror", err => errors.push(err.message));
    return { context, page, requested, release() { ready = true; gate.resolve(); }, errors, counts: () => ({ refreshCalls, writes }) };
  }

  const expired = await fixture("expired");
  try {
    await expired.page.goto(base);
    await expired.page.locator('#auth-form input[autocomplete="current-password"]').waitFor();
    assert.equal(await expired.page.locator('[data-screen="account-loading"]').count(), 0);
    assert.equal(await expired.page.evaluate(() => localStorage.getItem("faithful-repertoire-session")), null);
    assert.equal(await expired.page.evaluate(key => JSON.parse(localStorage.getItem(key)).songs[0].review.notes, store), workspace.songs[0].review.notes);
    assert.equal(expired.counts().refreshCalls, 1);
    assert.equal(expired.counts().writes, 0);
    assert.deepEqual(expired.errors, []);
  } finally { expired.release(); await expired.context.close(); }

  const delayed = await fixture("delayed");
  try {
    await delayed.page.goto(base);
    await delayed.requested.promise;
    const loading = delayed.page.locator('[data-screen="account-loading"]');
    assert.equal(await loading.getAttribute("aria-busy"), "true");
    assert.match(await loading.locator('[role="status"]').textContent(), /Checking your saved sign-in/);
    assert.equal(await loading.locator(".startup-indicator").evaluate(node => getComputedStyle(node).animationName), "startup-spin");
    await delayed.page.screenshot({ path: "/tmp/faithful-account-startup.png" });
    await delayed.page.getByRole("button", { name: "Try again", exact: true }).waitFor({ timeout: 6000 });
    await delayed.page.getByRole("button", { name: "Try again", exact: true }).click();
    delayed.release();
    await delayed.page.getByRole("button", { name: "My account", exact: true }).waitFor();
    await delayed.page.locator('.nav-item[data-view="settings"]').click();
    await delayed.page.waitForFunction(() => document.querySelector("#settings-save-value")?.textContent === "On");
    await delayed.page.screenshot({ path: "/tmp/faithful-settings-desktop.png" });
    await delayed.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await delayed.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const toggle = delayed.page.getByRole("switch", { name: "AI labels", exact: true });
    assert.equal(await toggle.getAttribute("aria-checked"), "true");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-checked"), "false");
    await delayed.page.screenshot({ path: "/tmp/faithful-settings-mobile.png", fullPage: true });
    await delayed.page.getByText("Advanced account tools", { exact: true }).click();
    assert.ok(await delayed.page.getByRole("button", { name: "Backup & restore", exact: true }).isVisible());
    assert.deepEqual(delayed.errors, []);
  } finally { delayed.release(); await delayed.context.close(); }

  const slow = await fixture("slow");
  try {
    await slow.page.goto(base);
    await slow.page.getByRole("button", { name: "Open saved browser copy", exact: true }).waitFor({ timeout: 6000 });
    // Leave the request pending: the deadline must open the saved workspace itself.
    await slow.page.getByRole("button", { name: "My account", exact: true }).waitFor({ timeout: 10000 });
    await slow.page.locator('.nav-item[data-view="settings"]').click();
    assert.equal(await slow.page.locator("#settings-save-value").textContent(), "Paused");
    assert.equal(slow.counts().writes, 0);
    assert.equal(await slow.page.evaluate(key => JSON.parse(localStorage.getItem(key)).songs[0].review.notes, store), workspace.songs[0].review.notes);
    slow.release();
    await slow.page.locator("#settings-save-now").click();
    await slow.page.waitForFunction(() => document.querySelector("#settings-save-value")?.textContent === "On");
    assert.deepEqual(slow.errors, []);
  } finally { slow.release(); await slow.context.close(); }

  const locked = await fixture("lock");
  try {
    await locked.context.route(base + "startup-lock-holder", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Fixture lock holder</title>" }));
    const holder = await locked.context.newPage();
    await holder.goto(base + "startup-lock-holder");
    await holder.evaluate(() => new Promise(acquired => {
      navigator.locks.request("faithful-repertoire-refresh:https://fixture.supabase.co", () => new Promise(release => { window.releaseStartupLock = release; acquired(); }));
    }));
    await locked.page.goto(base);
    await locked.page.getByRole("button", { name: "Open saved browser copy", exact: true }).waitFor({ timeout: 6000 });
    await locked.page.getByRole("button", { name: "Open saved browser copy", exact: true }).click();
    await locked.page.getByRole("button", { name: "My account", exact: true }).waitFor();
    assert.equal(locked.counts().refreshCalls, 0);
    assert.equal(locked.counts().writes, 0);
    locked.release();
    await holder.evaluate(() => window.releaseStartupLock());
    await locked.page.locator('.nav-item[data-view="settings"]').click();
    await locked.page.locator("#settings-save-now").click();
    await locked.page.waitForFunction(() => document.querySelector("#settings-save-value")?.textContent === "On");
    assert.equal(await locked.page.evaluate(key => JSON.parse(localStorage.getItem(key)).songs[0].review.notes, store), workspace.songs[0].review.notes);
    assert.deepEqual(locked.errors, []);
  } finally { locked.release(); await locked.context.close(); }
  console.log("PASS: expired session returns to sign-in without refresh; accessible startup progress; timed-out/locked checks preserve cached work and retry; grouped Settings and mobile switch.");
}
