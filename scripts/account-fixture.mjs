import { reveal } from "./disclosure.mjs";
import assert from "node:assert/strict";

// Provider fixture only. This exercises the client flow; it does not establish
// that a real Supabase project or its row-level security has been deployed.
export async function checkAccountFlows(browser, base) {
  const page = await browser.newPage();
  const users = {
    "one@example.test": {
      id: "00000000-0000-0000-0000-000000000001",
      email: "one@example.test",
    },
    "two@example.test": {
      id: "00000000-0000-0000-0000-000000000002",
      email: "two@example.test",
    },
  };
  const profiles = new Map(),
    workspaces = new Map();
  const sessions = new Map(),
    versions = new Map();
  let saveNumber = 0;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export const siteConfig = {supabaseUrl:"https://fixture.supabase.co",supabasePublishableKey:"sb_publishable_fixture_not_a_real_key"};',
    }),
  );
  await page.route("https://fixture.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const answer = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "apikey,authorization,content-type,prefer",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,OPTIONS",
        },
        body: status === 204 ? "" : JSON.stringify(value),
      });
    if (request.method() === "OPTIONS") return answer(null, 204);
    if (url.pathname.endsWith("/token")) {
      const user = users[request.postDataJSON().email];
      assert.ok(user);
      const token = `fixture-access-${user.id}`;
      sessions.set(token, user);
      return answer({
        access_token: token,
        refresh_token: `fixture-refresh-${user.id}`,
        user,
      });
    }
    const user = sessions.get(
      request.headers().authorization?.replace("Bearer ", ""),
    );
    assert.ok(user, "provider fixture requires an authenticated request");
    if (url.pathname.endsWith("/user")) return answer(user);
    if (url.pathname.endsWith("/logout")) return answer(null, 204);
    const table = url.pathname.endsWith("/profiles") ? profiles : workspaces;
    const field = table === profiles ? "profile" : "workspace";
    if (request.method() === "POST") {
      const data = request.postDataJSON();
      assert.equal(data.user_id, user.id);
      if (table === workspaces && table.has(user.id))
        return answer({ message: "Duplicate workspace" }, 409);
      table.set(user.id, structuredClone(data[field]));
      if (table === workspaces) {
        const date = new Date(
          Date.UTC(2026, 9, 11, 10, 0, ++saveNumber),
        ).toISOString();
        versions.set(user.id, date);
        return answer([{ updated_at: date }]);
      }
      return answer(null, 204);
    }
    assert.equal(url.searchParams.get("user_id"), `eq.${user.id}`);
    if (request.method() === "PATCH") {
      assert.equal(table, workspaces);
      if (url.searchParams.get("updated_at") !== `eq.${versions.get(user.id)}`)
        return answer([]);
      table.set(user.id, structuredClone(request.postDataJSON().workspace));
      const date = new Date(
        Date.UTC(2026, 9, 11, 10, 0, ++saveNumber),
      ).toISOString();
      versions.set(user.id, date);
      return answer([{ updated_at: date }]);
    }
    return answer(
      table.has(user.id)
        ? [
            {
              [field]: table.get(user.id),
              updated_at: versions.get(user.id) || new Date().toISOString(),
            },
          ]
        : [],
    );
  });
  await page.goto(base);
  async function login(email) {
    await reveal(page, "button", { name: "Sign in", exact: true });
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const form = page.locator("#auth-form");
    await form.getByLabel("Email", { exact: true }).fill(email);
    await form
      .getByLabel("Password", { exact: true })
      .fill("fixture-password-123");
    await form.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await page
        .getByRole("heading", { name: "Your account", exact: true })
        .waitFor({ timeout: 5000 });
    } catch {
      throw new Error(
        "Fixture sign-in failed: " +
          (await page.locator("#account-error").textContent()),
      );
    }
    await reveal(page, "button", { name: "Close dialog" });
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
  async function logout() {
    await reveal(page, "button", { name: "My account", exact: true });
    await page.getByRole("button", { name: "My account", exact: true }).click();
    await reveal(page, "button", { name: "Sign out", exact: true });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  }
  await login("one@example.test");
  await reveal(page, "button", { name: "Build my profile" });
  await page.getByRole("button", { name: "Build my profile" }).click();
  await page
    .getByLabel("Denomination", { exact: true })
    .selectOption("baptist");
  await reveal(page, "button", { name: "Continue", exact: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Statement of faith", { exact: true })
    .selectOption("london1689");
  await reveal(page, "button", { name: "Continue", exact: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /Human reviews only/ }).check();
  const syncing = page.waitForResponse(
    (r) => r.url().includes("/profiles") && r.request().method() === "POST",
  );
  await reveal(page, "button", { name: "Save my profile" });
  await page.getByRole("button", { name: "Save my profile" }).click();
  await syncing;
  assert.equal(profiles.get(users["one@example.test"].id).aiMode, "manual");
  assert.equal(
    profiles.get(users["one@example.test"].id).statement,
    "london1689",
  );
  await reveal(page, "button", { name: "Edit assessment" });
  await page.getByRole("button", { name: "Edit assessment" }).click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Private account-one note");
  await reveal(page, "button", { name: "Save assessment", exact: true });
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await reveal(page, "button", { name: "My account", exact: true });
  await page.getByRole("button", { name: "My account", exact: true }).click();
  await reveal(page, "button", { name: "Save account backup" });
  await page.getByRole("button", { name: "Save account backup" }).click();
  const saving = page.waitForResponse(
    (r) => r.url().includes("/workspaces") && r.request().method() === "POST",
  );
  await reveal(page, "button", { name: "Save this workspace" });
  await page.getByRole("button", { name: "Save this workspace" }).click();
  await saving;
  await page.getByRole("button", { name: "My account", exact: true }).waitFor();
  await page.locator("#account-save-strip summary").click();
  await page
    .locator("#account-save-strip")
    .getByText("Saved to your account", { exact: true })
    .waitFor();
  await reveal(page, "button", { name: "Edit assessment" });
  await page.getByRole("button", { name: "Edit assessment" }).click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Private account-one note, newer browser edit");
  await reveal(page, "button", { name: "Save assessment", exact: true });
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  assert.match(
    await page.locator("#account-save-strip").textContent(),
    /Changes saved in this browser/,
  );
  // A second device saved since this browser read the original version.
  versions.set(users["one@example.test"].id, "2026-10-11T12:00:00.000Z");
  await reveal(page, "button", { name: "Save to account", exact: true });
  await page
    .getByRole("button", { name: "Save to account", exact: true })
    .click();
  await reveal(page, "button", { name: "Save this workspace", exact: true });
  await page
    .getByRole("button", { name: "Save this workspace", exact: true })
    .click();
  await page
    .locator("#account-error")
    .getByText(/account copy changed/)
    .waitFor();
  await reveal(page, "button", { name: "Close dialog", exact: true });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  assert.ok(
    await page
      .getByRole("button", {
        name: "Save to account",
        exact: true,
        includeHidden: true,
      })
      .isDisabled(),
  );
  await reveal(page, "button", { name: "Review account copy", exact: true });
  await page
    .getByRole("button", { name: "Review account copy", exact: true })
    .click();
  await reveal(page, "button", { name: "Load this backup", exact: true });
  await page
    .getByRole("button", { name: "Load this backup", exact: true })
    .click();
  if (!(await page.locator('[data-attribute="notes"]').evaluate((n) => n.open)))
    await page.locator('[data-attribute="notes"] > summary').click();
  await page.getByText("Private account-one note", { exact: true }).waitFor();
  await logout();
  const guest = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hymn-heart-v1")),
  );
  assert.equal(guest.profile.aiMode, "full");
  assert.ok(
    !guest.songs.some((s) => s.review.notes.includes("Private account-one")),
  );

  await login("two@example.test");
  const second = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "faithful-repertoire-user:00000000-0000-0000-0000-000000000002",
      ),
    ),
  );
  assert.equal(second.profile.aiMode, "full");
  assert.ok(
    !second.songs.some((s) => s.review.notes.includes("Private account-one")),
  );
  await logout();
  await page.evaluate(() =>
    localStorage.removeItem(
      "faithful-repertoire-user:00000000-0000-0000-0000-000000000001",
    ),
  );
  await login("one@example.test");
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            "faithful-repertoire-user:00000000-0000-0000-0000-000000000001",
          ),
        ).profile.aiMode,
    ),
    "manual",
  );
  await reveal(page, "button", { name: "My account", exact: true });
  await page.getByRole("button", { name: "My account", exact: true }).click();
  await reveal(page, "button", { name: "Load account backup" });
  await page.getByRole("button", { name: "Load account backup" }).click();
  await reveal(page, "button", { name: "Load this backup" });
  await page.getByRole("button", { name: "Load this backup" }).click();
  if (!(await page.locator('[data-attribute="notes"]').evaluate((n) => n.open)))
    await page.locator('[data-attribute="notes"] > summary').click();
  await page.getByText("Private account-one note", { exact: true }).waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "faithful-repertoire-user:00000000-0000-0000-0000-000000000001",
      ),
    ),
  );
  assert.ok(!JSON.stringify(saved).includes("fixture-access"));
  assert.equal(workspaces.size, 1);
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "PASS: provider-fixture sign-in/out, automatic account profile sync, account workspace isolation, account backups and credential-free workspace exports.",
  );
}
