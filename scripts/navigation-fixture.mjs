import {navigate} from "./disclosure.mjs";
import assert from "node:assert/strict";

export async function checkNavigationFlows(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base);
  const rail = page.locator(".sidebar");
  const width = () => rail.evaluate((node) => node.getBoundingClientRect().width);
  const mainLeft = () => page.locator("#app > main").evaluate((node) => node.getBoundingClientRect().left);
  await page.waitForFunction(() => document.querySelector(".sidebar")?.getBoundingClientRect().width < 100);
  const left = await mainLeft();
  await rail.hover();
  await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().width > 240);
  assert.equal(await mainLeft(), left, "Expansion must not move page content");
  await navigate(page,"index");
  await page.mouse.move(600, 150);
  await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().width < 100);
  assert.ok(await width() < 100, "A pointer click must not keep navigation expanded after leaving");
  await page.locator(".brand").focus();
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().width > 240);
  assert.ok(await page.locator("nav .nav-label").first().isVisible(), "Keyboard focus must reveal navigation labels");
  await page.getByLabel("Search across all indexed fields").focus();
  await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().width < 100);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await rail.evaluate((node) => getComputedStyle(node).transitionDuration), "0s");
  await page.screenshot({ path: "/tmp/faithful-navigation-collapsed.png" });
  await rail.hover();
  await page.screenshot({ path: "/tmp/faithful-navigation-expanded.png" });
  const background = await rail.evaluate((node) => getComputedStyle(node).backgroundImage);
  assert.equal(background, "none");
  await page.close();

  const touch = await browser.newContext({ viewport: { width: 1024, height: 900 }, hasTouch: true, isMobile: true });
  await touch.addInitScript(() => sessionStorage.setItem("faithful-guest-opt-in", "1"));
  const touchPage = await touch.newPage();
  await touchPage.goto(base);
  assert.ok(await touchPage.locator("nav .nav-label").first().isVisible());
  await navigate(touchPage,"index");
  await touchPage.getByRole("heading", { name: "Song index", exact: true }).waitFor();
  assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await touchPage.setViewportSize({ width: 390, height: 844 });
  assert.equal(await touchPage.locator("nav .nav-label").count(), 4);
  for (const label of await touchPage.locator("nav .nav-label").all()) assert.ok(await label.isVisible());
  await touchPage.screenshot({ path: "/tmp/faithful-navigation-touch.png" });
  await touch.close();
  console.log("PASS: hover expansion/collapse without content shifts, keyboard labels, pointer focus release, reduced motion, solid fills and labeled touch navigation.");
}
