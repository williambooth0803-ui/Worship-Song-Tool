import { checkWorkspaceToolsFlows } from "./workspace-tools-fixture.mjs";
import { reveal, keepAIIfOffered, chooseSong } from "./disclosure.mjs";
import assert from "node:assert/strict";

// Provider fixture only. This exercises the client flow; it does not establish
// that a real Supabase project or its row-level security has been deployed.
export async function checkAccountFlows(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
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
  const privateFiles = new Map();
  let refreshCalls = 0;
  let saveNumber = 0;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.context().route("**/config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: 'export const siteConfig = {supabaseUrl:"https://fixture.supabase.co",supabasePublishableKey:"sb_publishable_fixture_not_a_real_key"};',
    }),
  );
  await page.context().route("https://fixture.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const answer = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "apikey,authorization,content-type,prefer,x-upsert",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
        },
        body: status === 204 ? "" : JSON.stringify(value),
      });
    if (request.method() === "OPTIONS") return answer(null, 204);
    if (url.pathname.endsWith("/token")) {
      const body = request.postDataJSON(), refreshing = url.searchParams.get("grant_type") === "refresh_token";
      const user = refreshing ? Object.values(users).find(u => body.refresh_token === "fixture-refresh-" + u.id) : users[body.email];
      assert.ok(user);
      if (refreshing) refreshCalls++;
      const token = `fixture-access-${user.id}-${refreshCalls}`;
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
    if (!user) return answer({message:"Expired fixture token"},401);
    if (url.pathname.startsWith("/storage/v1/object/")) {
      const path = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(?:authenticated\/)?song-files\/?/, ""));
      if (request.method() === "DELETE") {
        for(const p of request.postDataJSON().prefixes) { assert.ok(p.startsWith(user.id + "/")); privateFiles.delete(p); }
        return answer([]);
      }
      assert.ok(path.startsWith(user.id + "/"));
      if(request.method()==="POST") { privateFiles.set(path,request.postDataBuffer()); return answer({Key:path}); }
      const body=privateFiles.get(path);assert.ok(body);
      return route.fulfill({contentType:"application/octet-stream",body,headers:{"Access-Control-Allow-Origin":"*"}});
    }
    if (url.pathname.endsWith("/user")) return answer(user);
    if (url.pathname.endsWith("/rpc/org_list")) return answer({organizations:[],invitations:[]});
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
    assert.equal(await form.getByLabel("Email",{exact:true}).getAttribute("autocomplete"),"username");
    assert.equal(await form.getByLabel("Password",{exact:true}).getAttribute("autocomplete"),"current-password");
    assert.equal(await form.getByLabel("Password",{exact:true}).getAttribute("minlength"),null);
    // Password managers may set DOM values without emitting input events.
    await form.getByLabel("Email",{exact:true}).evaluate((input,email)=>input.value=email,email);
    await form.getByLabel("Password",{exact:true}).evaluate(input=>input.value="short!");
    await form.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await page
        .getByRole("button", { name: "My account", exact: true })
        .waitFor({ timeout: 5000 });
    } catch {
      throw new Error(
        "Fixture sign-in failed: " +
          (await page.locator("#account-error").textContent()),
      );
    }
  }
  async function logout() {
    const watching=await context.newPage();await watching.goto(base);
    await watching.getByRole("button",{name:"My account",exact:true}).waitFor();
    await reveal(page, "button", { name: "My account", exact: true });
    await page.getByRole("button", { name: "My account", exact: true }).click();
    await reveal(page, "button", { name: "Sign out", exact: true });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    await watching.getByRole("button",{name:"Sign in",exact:true}).waitFor();
    await watching.close();
  }
  await login("one@example.test");
  await reveal(page,"button",{name:"Manage files",exact:true});
  await page.getByRole("button",{name:"Manage files",exact:true}).click();
  await page.locator('#song-file-form input[type="file"]').setInputFiles({name:"Account chart.txt",mimeType:"text/plain",buffer:Buffer.from("Account-only chart")});
  await page.getByRole("button",{name:"Upload file",exact:true}).click();
  await page.getByText("Account chart.txt · 1 KB",{exact:true}).waitFor();
  assert.equal(privateFiles.size,1);
  await page.getByRole("button",{name:"Close dialog",exact:true}).click();
  const old=await page.evaluate(()=>JSON.parse(localStorage.getItem("faithful-repertoire-session")).session.access_token);
  sessions.delete(old);
  const anotherTab=await page.context().newPage();
  const concurrentTab=await page.context().newPage();
  await Promise.all([anotherTab.goto(base),concurrentTab.goto(base)]);
  await anotherTab.getByRole("button",{name:"My account",exact:true}).waitFor();
  await concurrentTab.getByRole("button",{name:"My account",exact:true}).waitFor();
  assert.equal(refreshCalls,1,"Concurrent tabs share a single refresh-token rotation");
  await concurrentTab.close();
  await anotherTab.reload();
  await anotherTab.getByRole("button",{name:"My account",exact:true}).waitFor();
  await anotherTab.close();
  await checkWorkspaceToolsFlows(page);
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
  await page.getByRole("radio", { name: /Human evaluations only/ }).check();
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
  const noteSong={id:await page.locator(".detail-panel").getAttribute("data-song-id"),title:await page.locator(".detail-panel h2").textContent()};
  await reveal(page, "button", { name: "Edit evaluation" });
  await page.getByRole("button", { name: "Edit evaluation" }).click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Private account-one note");
  await reveal(page, "button", { name: "Save evaluation", exact: true });
  await page
    .getByRole("button", { name: "Save evaluation", exact: true })
    .click();
  await keepAIIfOffered(page);
  await reveal(page, "button", { name: "Manage recording links", exact: true });
  await page.getByRole("button", { name: "Manage recording links", exact: true }).click();
  await page.getByLabel("Recording platform").selectOption("youtube");
  await page.getByLabel("Recording link", { exact: true }).fill("https://www.youtube.com/watch?v=abcdefghijk");
  await page.getByLabel("Version label", { exact: true }).fill("Account recording");
  await page.getByRole("button", { name: "Save recording link", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#account-save-strip")?.textContent.includes("Saved to your account"));
  assert.equal(workspaces.get(users["one@example.test"].id).indexViews.length, 1);
  assert.equal(workspaces.get(users["one@example.test"].id).planTemplates.length, 2);
  assert.ok(workspaces.get(users["one@example.test"].id).songs.some(s => s.recordings?.some(r => r.label === "Account recording")));
  await page.getByRole("button", { name: "My account", exact: true }).waitFor();
  await page.locator("#account-save-strip summary").click();
  await page
    .locator("#account-save-strip")
    .getByText("Saved to your account", { exact: true })
    .waitFor();
  await reveal(page, "button", { name: "Edit evaluation" });
  await page.getByRole("button", { name: "Edit evaluation" }).click();
  await page
    .getByLabel("Your notes", { exact: true })
    .fill("Private account-one note, newer browser edit");
  await reveal(page, "button", { name: "Save evaluation", exact: true });
  await page
    .getByRole("button", { name: "Save evaluation", exact: true })
    .click();
  await keepAIIfOffered(page);
  assert.match(
    await page.locator("#account-save-strip").textContent(),
    /Saved in this browser|Saving/,
  );
  // A second device saved since this browser read the original version.
  versions.set(users["one@example.test"].id, "2026-10-11T12:00:00.000Z");
  await page.waitForFunction(() => document.querySelector("#account-save-strip")?.textContent.includes("Another device saved changes"));
  await reveal(page, "button", { name: "Save now / retry", exact: true });
  assert.ok(await page.getByRole("button", {name:"Save now / retry",exact:true}).isDisabled());
  await page.getByRole("button", {name:"Review saved account workspace",exact:true}).click();
  await reveal(page, "button", { name: "Load this backup", exact: true });
  await page
    .getByRole("button", { name: "Load this backup", exact: true })
    .click();
  await chooseSong(page,noteSong);
  await page.getByRole("tab",{name:"Details & files",exact:true}).click();
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
  assert.equal(second.indexViews.length, 0);
  assert.equal(second.planTemplates.length, 0);
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
  // The account button appears before the asynchronous profile download finishes.
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('faithful-repertoire-user:00000000-0000-0000-0000-000000000001'))?.profile.aiMode==='manual');
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
  await page.locator("dialog").getByRole("button", {name:"Settings",exact:true}).click();
  await page.getByRole("button", {name:"Review saved account workspace",exact:true}).click();
  await reveal(page, "button", { name: "Load this backup" });
  await page.getByRole("button", { name: "Load this backup" }).click();
  await chooseSong(page,noteSong);
  await page.getByRole("tab",{name:"Details & files",exact:true}).click();
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
  assert.equal(saved.indexViews.length, 1);
  assert.equal(saved.planTemplates.length, 2);
  assert.ok(!JSON.stringify(saved).includes("fixture-access"));
  assert.equal(workspaces.size, 1);
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "PASS: provider-fixture sign-in/out, automatic account profile sync, account workspace isolation, account backups and credential-free workspace exports.",
  );
}
