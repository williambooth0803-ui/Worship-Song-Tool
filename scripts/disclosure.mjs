// Exercise the real summary controls before a formerly visible action.
export async function chooseSong(page,song) {
  await page.locator('.nav-item[data-view="discover"]').click();
  await page.getByRole("searchbox",{name:"Search songs",exact:true}).fill(song.title);
  await page.locator(`.song-card[data-id=${JSON.stringify(song.id)}]`).click();
}
export async function keepAIIfOffered(page) {
  const button = page.getByRole("button", { name: "Keep AI evaluation", exact: true });
  if (await button.isVisible()) await button.click();
}
export async function reveal(page, role, options) {
  const target = page.getByRole(role, { ...options, includeHidden: true });
  if (!(await target.count()) && ["Backup & restore", "ChatGPT connections", "Import previous browser-only workspace", "Retry profile sync"].includes(options.name)) {
    await navigate(page,"settings");
  }
  const tab = await target.evaluate(el => el.closest('.song-tab-panel')?.dataset.tab);
  if (tab) await page.locator(`[data-action="song-tab"][data-tab="${tab}"]`).click();
  const summaries = await target.evaluate((el) => {
    const list = [];
    for (let n = el.parentElement; n; n = n.parentElement)
      if (n.tagName === "DETAILS" && !n.open)
        list.unshift(n.querySelector(":scope > summary").textContent);
    return list;
  });
  for (const text of summaries)
    await page.locator("summary").filter({ hasText: text }).first().click();
}

// Follow the visible hierarchy instead of depending on former sidebar entries.
export async function navigate(page, view) {
  const parent = {collections:"discover", index:"evaluate", profile:"evaluate", blacklist:"library"}[view];
  if (parent) await page.locator(`.nav-item[data-view="${parent}"]`).click();
  const selector = view === "settings" ? '.settings-gear' : parent ? `.workspace-tabs [data-view="${view}"]` : `.nav-item[data-view="${view}"]`;
  await page.locator(selector).click();
}
