// Native HTTPS management requests support securely injected proxy credentials.
// No OpenAI key, service-role key, database password, or config overwrite.
import { readFile } from "node:fs/promises";
import { mcpUpload } from "./mcp-upload.mjs";
import { waitForOAuthDiscovery } from "./oauth-discovery.mjs";
import { siteConfig } from "../public/config.js";
const project = new URL(siteConfig.supabaseUrl).hostname.split(".")[0];
const endpoint = siteConfig.supabaseUrl + "/functions/v1/faithful-mcp";
const upload = await mcpUpload();
if (process.argv.includes("--dry-run")) {
  console.log(
    JSON.stringify(
      {
        project,
        metadata: upload.metadata,
        files: upload.files,
        order: [
          "verify published consent page",
          "apply read-only SQL",
          "deploy function",
          "verify authentication challenge",
          "enable native OAuth",
        ],
        requires: "SUPABASE_ACCESS_TOKEN in secure environment settings",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (!process.env.SUPABASE_ACCESS_TOKEN)
  throw new Error(
    "Add SUPABASE_ACCESS_TOKEN securely in environment settings; do not paste it in chat.",
  );
async function api(url, options = {}) {
  const response = await fetch(
    "https://api.supabase.com/v1/projects/" + project + url,
    {
      ...options,
      headers: {
        Authorization: "Bearer " + process.env.SUPABASE_ACCESS_TOKEN,
        ...options.headers,
      },
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Supabase ${options.method || "GET"} ${url} failed (${response.status}). Check project access. No credential values are logged.`,
    );
  return response.status === 204 ? null : response.json();
}
const auth = await api("/config/auth");
const site = new URL(auth.site_url || "");
if (
  site.href.replace(/\/$/, "") !==
  "https://williambooth0803-ui.github.io/Worship-Song-Tool"
)
  throw new Error(
    "Set the Supabase Site URL to the published application before deployment.",
  );
const consent = await fetch(
  new URL("connect.js", site.href.endsWith("/") ? site : site.href + "/"),
  { signal: AbortSignal.timeout(15000) },
);
if (
  !consent.ok ||
  (await consent.text()) !==
    (await readFile(new URL("../public/connect.js", import.meta.url), "utf8"))
)
  throw new Error(
    "Publish the current consent page to GitHub Pages before deploying.",
  );
await api("/database/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: await readFile(
      new URL("../supabase/mcp.sql", import.meta.url),
      "utf8",
    ),
  }),
});
console.log("Read-only database migration applied.");
await api("/functions/deploy?slug=faithful-mcp", {
  method: "POST",
  body: upload.form,
});
const metadata = await fetch(
  endpoint + "/.well-known/oauth-protected-resource",
  { signal: AbortSignal.timeout(15000) },
);
if (!metadata.ok || (await metadata.json()).resource !== endpoint)
  throw new Error(
    "Function metadata verification failed. OAuth has not been enabled.",
  );
const challenge = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
  signal: AbortSignal.timeout(15000),
});
if (
  challenge.status !== 401 ||
  !challenge.headers.get("www-authenticate")?.includes("resource_metadata")
)
  throw new Error(
    "Function authentication verification failed. OAuth has not been enabled.",
  );
await api("/config/auth", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    oauth_server_enabled: true,
    oauth_server_allow_dynamic_registration: true,
    oauth_server_authorization_path: "/connect.html",
  }),
});
await waitForOAuthDiscovery(siteConfig.supabaseUrl, {
  onRetry: () => console.log("Waiting for Supabase OAuth settings to become available…"),
});
console.log(
  "Connector deployed and native OAuth enabled. Authorize it from ChatGPT to verify your own saved account data.",
);
