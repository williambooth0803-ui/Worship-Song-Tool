# Read-only ChatGPT connection

The project's connector is deployed: its public health, resource metadata, OAuth
discovery and unauthenticated 401 challenge have been verified. Each account still
needs to authorize the connection and check its own saved records in ChatGPT.
For a new project, deploy `supabase/mcp.sql`, the Edge function and native OAuth
configuration before connecting. The public website and account sign-in can work
before that step.
No OpenAI API key or paid OpenAI API billing is used. ChatGPT answers in your own
ChatGPT session; Supabase hosts the read tools within your project's existing quotas.

## Activate the backend

### Deploy using GitHub (also works when the Codex environment editor is blocked)

1. Open the repository's **Settings → Secrets and variables → Actions**.
2. Choose **New repository secret**, use the name **`SUPABASE_ACCESS_TOKEN`**,
   and enter your Supabase personal access token there. Do not put it in a
   repository variable, source file, issue, or chat. The deployment needs
   `auth:read`, `auth:write`, `database:write`, and `edge_functions:write` for
   project `inhqxwratimjvzsnuwik`.
3. Open **Actions → Deploy ChatGPT connection → Run workflow**. Select **main**
   and click **Run workflow**. This is a manual deployment; ordinary pushes
   and pull requests do not run it.
4. Wait for the run to turn green, then follow **Connect in ChatGPT** below.
   If it fails, check the failing step before retrying. It may have completed
   earlier operations; do not enable OAuth manually before the database and
   function checks succeed.

The workflow installs the frozen dependencies, runs the unit/security suite and
Deno check, and uses the existing deployment script. Only the final deployment
step receives the token. It does not require a Codex environment secret, an
OpenAI API key, or software installed on your computer. GitHub Actions and
Supabase remain subject to their usual account quotas. After deployment, you
may remove the repository secret; future deployments require adding it again.

### Deploy from the Codex environment

The existing public project key cannot administer your project. Create a Supabase
personal access token at https://supabase.com/dashboard/account/tokens and enter it
as **SUPABASE_ACCESS_TOKEN in Codex environment settings**, then save/publish the
configuration. Do not paste that token into chat, source files or browser settings.
The saved configuration scopes this secret to `api.supabase.com`.

Once available, run:

```sh
npm run deploy:mcp -- --dry-run  # Shows files and planned operations; no mutations
npm run deploy:mcp
```

The npm deployment command enables Node's environment-proxy support, so securely
injected credentials use their configured HTTPS destination. Use Node 24+ for
deployment in the cloud environment.

The deployment script verifies that the current consent page is published, applies
owner isolation/read-only policies, deploys the function, checks its public resource
metadata and unauthenticated 401 challenge, and only then enables Supabase OAuth.
It updates only three OAuth settings, preserving the existing email/site configuration.
The final discovery check retries briefly while Supabase applies those settings;
it verifies the issuer, OAuth endpoints, dynamic registration, and PKCE support.
These retries only read the public endpoint and do not repeat deployment writes.
The base tables must already exist from `supabase/schema.sql`.

If administering manually:

1. Run [supabase/mcp.sql](supabase/mcp.sql) in the Supabase SQL editor after the base schema.
2. Deploy `faithful-mcp` with its checked-in entrypoint/import map. The supported CLI alternative is `npx supabase@2.120.0 functions deploy faithful-mcp --project-ref inhqxwratimjvzsnuwik --no-verify-jwt` from this repository, with securely configured Supabase CLI authentication.
3. Keep the Auth Site URL `https://williambooth0803-ui.github.io/Worship-Song-Tool/`. Under Authentication → OAuth Server, enable the server, set the authorization path to **`/connect.html`**, and enable dynamic client registration. Supabase appends that path to the Site URL; do not repeat the repository folder.
4. Check the endpoints below, then authorize from ChatGPT. Supabase OAuth requires an asymmetric signing key; this project currently exposes an ES256 key. The connector accepts ES256/RS256 and rejects legacy HS256 signing.

**Apply the database migration before enabling OAuth.** Both the updated base schema
and migration exclude OAuth `client_id` tokens from raw workspace/profile access and
writes. Never deploy this connector with a service-role key. Disabling the platform's
legacy JWT gateway is necessary for public discovery; the handler independently verifies
every data request against Supabase's issuer, native `authenticated` audience, signing
keys, expiration, role, user ID, client ID, and an explicit approved account grant.

## Connect in ChatGPT

In ChatGPT's **Plugins** interface, open **Settings → Plugins → Browse directory →
Add → Add custom MCP server**. Name it **Faithful Repertoire**, choose OAuth if
prompted, and enter:

```
https://inhqxwratimjvzsnuwik.supabase.co/functions/v1/faithful-mcp
```

Menus vary by account and interface. Interfaces using **Apps** may instead expose
custom creation under **Advanced settings → Developer mode**. Do not enter a
Supabase personal access token in either connection form. The connector supports
native OAuth discovery and dynamic client registration.

Open the authorization prompt, sign in with your Faithful Repertoire account, choose
what to share and approve. Libraries, profile and existing plans start checked;
**personal notes and stored song text start unchecked**. Song-text permission allows
reading your stored words, although normal tool responses return at most a 1,200-character
excerpt only when explicitly requested. Shared records go to ChatGPT when used.

Save your workspace using **Account sync → Save to account** first. Browser-only edits
are unavailable to this connection. Profile preferences save separately; the backend
uses the saved profile's AI visibility even when the workspace was saved earlier.

If a newly installed plugin is unavailable in an existing conversation, start a
fresh ChatGPT conversation, select Faithful Repertoire if needed, and ask
“Using Faithful Repertoire, list my libraries.” A successful account lookup is
required to verify the private connection; public endpoint checks alone do not.

Examples: “List my libraries,” “What notes did I save for Forever?” (with notes shared),
“Show my saved service outline,” or an explicitly requested tentative search of one
library using your own criterion. The connector never selects a worship service,
generates a setlist, or changes your records. Plans remain human-created.

Revoke under **My account → ChatGPT connections → Revoke access**. Database access is
blocked first, then the native provider grant is removed. If provider removal fails,
the screen states that data access is already disabled and offers a retry.

## Read tools and boundaries

| Tool | Access |
| --- | --- |
| `get_my_profile` | Denomination, faith statement, principles, weights, AI visibility |
| `list_my_libraries` | Owned library IDs, names and counts |
| `search_my_songs` | One owned library, user-chosen query/filters/sort |
| `get_my_song` | Visible assessment and observed musical details; optional notes/text |
| `list_my_plans` | Existing human-created plans |
| `get_my_plan` | Saved order, roles, keys and durations; optional notes |

Results carry save timestamps, read-only/untrusted-reference notices and AI visibility.
Tools have strict schemas, read-only annotations, no arbitrary SQL/HTTP or owner-ID
parameters, and bounded pages (up to 50 records). Song/plan lookup is owner scoped.
No write, recommendation, account-password, email, secret or automatic-planning tools
exist. Full API results are JSON data, never HTML to execute.

OAuth cannot read raw JSON workspaces, change reviews/plans/profile/connection grants,
or bypass visibility by calling the database directly. A SECURITY DEFINER projection
function derives the owner/client from verified claims and redacts hidden AI fields,
notes and song text before returning data. It has no supplied owner parameters.
Native signed-in website sessions retain their normal owner-scoped writes. A durable
per-account/client limit allows 60 snapshot reads per minute. Revocation is checked
on every authenticated request and again on each snapshot read.

Public checks after deployment:

- `GET <connector URL>/health`: service status, no account data.
- `GET <connector URL>/.well-known/oauth-protected-resource`: MCP resource metadata.
- `POST <connector URL>` without a bearer: 401 with `WWW-Authenticate` metadata URL.
- `GET https://inhqxwratimjvzsnuwik.supabase.co/.well-known/oauth-authorization-server/auth/v1`: native OAuth discovery.

## Verification and limits

`npm test` exercises actual PostgreSQL RLS/projection/revocation/rate limits through
PGlite and an official MCP SDK client round trip, plus signed JWT failure cases.
`npm run check:mcp` checks the actual Deno entrypoint. The Deno HTTP runtime's public
metadata/health and missing-token challenge were also exercised locally.
`npm run test:hosted` tests consent, default scopes, denial, malicious redirects and
the website's account workflow using provider fixtures. Fixtures are not deployed
Supabase proof or a real ChatGPT authorization. After deploying, verify a real
ChatGPT connection, hidden AI preferences, another account's isolation, and revocation.

Native Supabase OAuth uses the `authenticated` audience; record access is enforced by
client-ID policies and the consent projection rather than treating identity scopes as
data permissions. OAuth server is currently a Supabase beta feature. The app still
stores each owner's workspace as JSON; normal workspace size/storage limits apply.

Official implementation references:

- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://supabase.com/docs/guides/ai-tools/byo-mcp
- https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- https://github.com/openai/openai-apps-sdk-examples/tree/main/authenticated_server_python
