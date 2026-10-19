# Cloudflare Pages setup

This repository already builds a static website into `docs`. Supabase continues
to provide authentication, account workspaces, organizations, files and the
read-only ChatGPT connection. GitHub Pages can remain available during setup.

## Create the Git-connected Pages project

In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to
Git**. Choose the connected GitHub account and this repository:
`williambooth0803-ui/Worship-Song-Tool`.

Use these settings:

| Setting | Value |
| --- | --- |
| Project name | `faithful-repertoire`, or another available name |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build:site` |
| Build output directory | `docs` |
| Root directory | Leave blank: repository root |
| Node version | 24, selected by the committed `.node-version` |
| Additional environment variables | None needed for the existing public configuration |

If the form asks for a Worker entrypoint or a Wrangler deploy command, return to
the Pages setup. This application uses static Pages hosting; `server.js` is a
local development server and is not the deployment entrypoint.

Select **Save and Deploy**. Record the actual production `https://….pages.dev`
URL Cloudflare returns; the project name alone does not prove that URL exists.
Subsequent pushes to `main` can deploy automatically through the Git integration.
Do not put Supabase management/service-role credentials or AI-provider secrets in
this static site's build settings. Its committed Supabase settings are public
browser identifiers, protected by the existing database authorization policies.

Official references: [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/),
[build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
and [Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/).

## Verify the deployment before changing the main address

Open the returned production URL and check the sign-in screen and public About.
Use a disposable browser-only workspace to verify the 835-song catalog, song
evaluations, collections, libraries/plans, and the shortlist flashcards.
Cloudflare serves the `docs` contents at the domain root; do not append `/docs`
or `/Worship-Song-Tool/` to the Cloudflare URL.

Cloudflare normally redirects `.html` URLs to extensionless paths. Verify both
the flashcard link (`review.html` → `/review`) and the consent page
(`connect.html` → `/connect`), including preservation of the consent query string.
See [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

The owner created the project and supplied
[faithful-repertoire.pages.dev](https://faithful-repertoire.pages.dev/). Cloudflare's
GitHub check reports a successful deployment of `6075c76`, deployment
`255770a8-516a-4044-bda9-648c31413ccd`. This confirms the provider-reported deployment,
not an automated browser test. The owner confirmed on October 19, 2026 that the
site opens normally and existing account sign-in works. Direct checks from the managed workspace
are blocked because `faithful-repertoire.pages.dev` is outside its network
allowlist (proxy CONNECT 403); the web-reading tool also could not open it.
The old GitHub site stays available.

## Authentication and saved-work migration

In the [Supabase project](https://supabase.com/dashboard/project/inhqxwratimjvzsnuwik),
open **Authentication → URL Configuration → Redirect URLs → Add URL**, add
`https://faithful-repertoire.pages.dev/` if it is not already listed, and save. Keep the existing
GitHub URL during verification. This permits confirmation/password-reset links
requested from the new site to return there. The same Supabase project means
existing accounts and server-saved workspaces remain available after sign-in.

The configured management credential was rejected by Supabase (HTTP 401), so
this redirect-list change has **not** been applied by Codex. The owner needs to
make the dashboard change above or restore valid management access. Preserve
all other redirect entries and retain the current Site URL during this stage.
No Supabase auth settings, workspaces or connector settings were modified.

Browser-only workspaces, remembered sessions and flashcard decisions belong to
the original browser origin. They do not automatically appear at a different
hostname. Export workspace data from the old site and download the flashcard
backup, then explicitly restore those copies on the new site. Keep the old site
available until those copies and account sign-in are checked. Never copy passwords
or session tokens into workspace exports.

For the first deployment, retain the existing Supabase Site URL and ChatGPT
consent configuration. The ChatGPT connection can continue using the published
GitHub consent page while the Cloudflare site is tested. A complete primary-domain
switch also requires coordinating the Supabase Site URL, OAuth authorization path,
the MCP function's allowed site origin, and the deployment script's current
GitHub-specific consent-page check. Update those together after the actual final
domain is known; retain existing ChatGPT origins and read-only authorization.
Do not replace the connector endpoint with the Cloudflare website URL: it remains
the existing Supabase function endpoint.

Preview deployments use the same committed public Supabase configuration unless
a separate backend configuration is explicitly provided. Add only intended
production/controlled redirect URLs, rather than a wildcard for all Pages sites.

If a custom domain is desired, connect and verify that domain in the Pages
project first, then use that final address for the authentication/domain changes.
No custom domain or DNS changes are necessary for the initial `pages.dev` test.
