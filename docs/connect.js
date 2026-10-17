import { AccountClient } from "./accounts.js";
import { siteConfig } from "./config.js";
import { chatgptRedirect, connectionDefaults } from "./connection.js";
const client = new AccountClient(siteConfig),
  root = document.querySelector("#connection-content");
const id = new URL(location.href).searchParams.get("authorization_id");
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let details, owner;
function error(message) {
  const node = document.querySelector("#connection-error");
  if (node) node.textContent = message;
  else root.textContent = message;
}
async function show() {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id || ""))
    throw new Error("Open this page from the ChatGPT connection setup.");
  if (!client.user) {
    root.innerHTML =
      '<p>Sign in to choose what ChatGPT may read.</p><form id="connect-signin" autocomplete="on"><label>Email<input id="connect-email" name="email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required></label><label>Password<input id="connect-password" name="password" type="password" autocomplete="current-password" required></label><p id="connection-error" role="alert"></p><button class="button primary">Sign in</button></form><p><a href="./index.html" target="_blank" rel="noopener">Create an account or reset your password</a></p>';
    return;
  }
  owner = client.user.id;
  details = await client.authorizationDetails(id);
  if (client.user?.id !== owner)
    throw new Error("Your account changed. Start again from ChatGPT.");
  if (details.redirect_url) {
    const redirect = chatgptRedirect(details.redirect_url);
    root.innerHTML = `<p>This request was already authorized. Disabled access must be reconnected through My account.</p><a class="button" href="${e(redirect)}">Return to ChatGPT</a>`;
    return;
  }
  chatgptRedirect(details.redirect_uri);
  if (!details.client?.id || details.user?.id !== owner)
    throw new Error("The authorization does not match your account.");
  root.innerHTML = `<p><strong>${e(details.client.name || "ChatGPT")}</strong> is requesting read-only access as ${e(client.user.email)}.</p><p>Choose what it may read from your saved account copy. Your account AI content preference applies. Browser-only changes need to be saved first.</p><form id="connect-consent">${Object.entries(
    {
      profile: "Evaluation criteria",
      libraries: "Libraries and song assessments",
      plans: "Existing worship plans",
      notes: "Personal and service notes",
      lyrics: "Stored song text",
    },
  )
    .map(
      ([key, label]) =>
        `<label class="check-label"><input type="checkbox" name="${key}" ${connectionDefaults[key] ? "checked" : ""}>${label}</label>`,
    )
    .join(
      "",
    )}<p class="muted">Song-text access allows reading your stored text; connector responses normally use short excerpts. Shared information is sent to ChatGPT when you use the connection. This connection has no tools to edit songs or plans. Worship planning remains yours.</p><p id="connection-error" role="alert"></p><div class="form-actions"><button class="button" type="button" id="deny">Cancel</button><button class="button primary">Allow read-only access</button></div></form>`;
  document.querySelector("#deny").onclick = () => decide(false);
}
async function decide(approve) {
  const form = document.querySelector("#connect-consent");
  const buttons = [...form.querySelectorAll("button")];
  buttons.forEach((b) => (b.disabled = true));
  let grantSaved = false;
  try {
    if (client.user?.id !== owner)
      throw new Error("Your account changed. Start again from ChatGPT.");
    if (approve) {
      const permissions = Object.fromEntries(
        Object.keys(connectionDefaults).map((k) => [
          k,
          form.elements[k].checked,
        ]),
      );
      if (!["profile", "libraries", "plans"].some((k) => permissions[k]))
        throw new Error("Choose a profile, libraries, or plans to share.");
      await client.saveConnection(details.client, permissions);
      grantSaved = true;
    }
    const result = await client.decideAuthorization(
      id,
      approve ? "approve" : "deny",
    );
    location.assign(chatgptRedirect(result.redirect_url, details.redirect_uri));
  } catch (err) {
    if (grantSaved) {
      try {
        await client.disableConnection(details.client.id);
      } catch {
        error(
          "Authorization failed and access could not be disabled. Revoke this connection in My account.",
        );
        buttons.forEach((b) => (b.disabled = false));
        return;
      }
    }
    error(err.message);
    buttons.forEach((b) => (b.disabled = false));
  }
}
root.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "connect-consent") return decide(true);
  const form = event.target;
  form.querySelector("button").disabled = true;
  try {
    await client.signIn(
      form.elements.email.value,
      form.elements.password.value,
    );
    await show();
  } catch (err) {
    error(err.message);
    form.querySelector("button").disabled = false;
  }
});
try {
  await client.restoreSession();
  await show();
} catch (err) {
  error(err.message);
}
