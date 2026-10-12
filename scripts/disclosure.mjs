// Exercise the real summary controls before a formerly visible action.
export async function keepAIIfOffered(page) {
  const button = page.getByRole("button", { name: "Keep AI evaluation", exact: true });
  if (await button.isVisible()) await button.click();
}
export async function reveal(page, role, options) {
  const target = page.getByRole(role, { ...options, includeHidden: true });
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
