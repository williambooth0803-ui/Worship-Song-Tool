import assert from "node:assert/strict";
export async function checkConnectionFlows(browser, base) {
  const page = await browser.newPage();
  const user = {
      id: "10000000-0000-4000-8000-000000000001",
      email: "owner@example.test",
    },
    clientId = "20000000-0000-4000-8000-000000000001";
  let hostile = false,
    connection;
  const calls = [];
  await page.route("**/config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export const siteConfig={supabaseUrl:"https://fixture.supabase.co",supabasePublishableKey:"sb_publishable_fixture"};',
    }),
  );
  await page.route("https://chatgpt.com/connector/callback?*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Returned to ChatGPT</h1>",
    }),
  );
  await page.route("https://fixture.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const answer = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "apikey,authorization,content-type,prefer",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        },
        body: status === 204 ? "" : JSON.stringify(data),
      });
    if (request.method() === "OPTIONS") return answer(null, 204);
    calls.push({
      path: url.pathname,
      method: request.method(),
      body: request.postDataJSON(),
    });
    if (url.pathname === "/auth/v1/token")
      return answer({
        access_token: "fixture-token",
        refresh_token: "fixture-refresh",
        expires_in: 3600,
        user,
      });
    if (url.pathname === "/auth/v1/user") return answer(user);
    if (url.pathname.endsWith("/consent"))
      return answer({
        redirect_url:
          "https://chatgpt.com/connector/callback?code=fixture&state=test",
      });
    if (url.pathname.includes("/authorizations/"))
      return answer({
        authorization_id: "request-test",
        client: { id: clientId, name: "ChatGPT" },
        user,
        scope: "openid",
        redirect_uri: hostile
          ? "https://evil.test/callback"
          : "https://chatgpt.com/connector/callback",
      });
    if (url.pathname === "/rest/v1/mcp_connections") {
      if (request.method() === "GET")
        return answer(connection ? [connection] : []);
      if (request.method() === "PATCH") {
        connection.enabled = false;
        return answer([connection]);
      }
      connection = request.postDataJSON();
      return answer(null, 204);
    }
    if (url.pathname === "/auth/v1/user/oauth/grants") return answer(null, 204);
    if (["/rest/v1/profiles", "/rest/v1/workspaces"].includes(url.pathname))
      return answer([]);
    return answer({ message: "Unexpected fixture request" }, 400);
  });
  try {
    await page.goto(base + "connect.html?authorization_id=request-test");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("fixture-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Allow read-only access" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Personal and service notes").isChecked(),
      false,
    );
    assert.equal(await page.getByLabel("Stored song text").isChecked(), false);
    await page.getByRole("button", { name: "Allow read-only access" }).click();
    await page.getByRole("heading", { name: "Returned to ChatGPT" }).waitFor();
    const grant = calls.find((x) => x.path === "/rest/v1/mcp_connections");
    assert.equal(grant.body.user_id, user.id);
    assert.equal(grant.body.share_notes, false);
    assert.equal(grant.body.share_lyrics, false);
    assert.equal(grant.body.share_libraries, true);
    assert.ok(
      calls.indexOf(grant) <
        calls.findIndex((x) => x.path.endsWith("/consent")),
    );
    assert.ok(!calls.some((x) => x.path.includes("/workspaces")));
    calls.length = 0;
    await page.goto(base + "connect.html?authorization_id=request-test");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("heading", { name: "Returned to ChatGPT" }).waitFor();
    assert.equal(
      calls.find((x) => x.path.endsWith("/consent")).body.action,
      "deny",
    );
    assert.ok(!calls.some((x) => x.path === "/rest/v1/mcp_connections"));
    hostile = true;
    calls.length = 0;
    await page.goto(base + "connect.html?authorization_id=request-test");
    await page
      .getByText("This authorization is not returning to ChatGPT.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Allow read-only access" })
        .count(),
      0,
    );
    assert.ok(!calls.some((x) => x.path === "/rest/v1/mcp_connections"));
    calls.length = 0;
    await page.goto(base);
    await page.getByRole("button", { name: "My account", exact: true }).click();
    await page.locator("dialog").getByRole("button", {name:"Settings",exact:true}).click();
    await page.getByText("Advanced account tools",{exact:true}).click();
    await page
      .getByRole("button", { name: "ChatGPT connections", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Revoke access", exact: true })
      .click();
    await page.getByText(/Access disabled/).waitFor();
    const disable = calls.findIndex(
        (x) => x.path === "/rest/v1/mcp_connections" && x.method === "PATCH",
      ),
      revoke = calls.findIndex(
        (x) => x.path === "/auth/v1/user/oauth/grants" && x.method === "DELETE",
      );
    assert.ok(disable >= 0 && revoke > disable);
  } finally {
    await page.close();
  }
  console.log(
    "PASS: OAuth consent sign-in, explicit read scopes, notes/text off, grant-before-consent, denial and malicious redirect rejection.",
  );
}
