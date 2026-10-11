# Faithful Repertoire

A worship-planning workspace for choosing songs with sound doctrine, meaningful lyrics, clear English and purposeful use of service time.

The public website is hosted at https://williambooth0803-ui.github.io/Worship-Song-Tool/. GitHub Pages publishes `main` → `/docs`; regenerate and commit those files after frontend changes.

## Current workflow

- Build a profile from the prominent setup prompt: denomination, a named statement-of-faith starting point, custom convictions and personal AI-content visibility.
- Search 20 traditional hymns by title, author, opening line or theme. Filter by theme and church-use decision; sort by title, overall rating or theological substance.
- Edit assessments, personal notes, Scripture connections, source links, arrangement observations, key and duration.
- Compare your current review with the separately preserved catalog assessment.
- Mark songs as not reviewed, approved, approved with context or to avoid. Context/avoid decisions require reasoning; approving requires acknowledgement of the exact version and concerns. Changes to the assessment require fresh approval. Avoided songs require reconsideration before being added to a plan.
- Save songs to multiple libraries. Build and reorder services with songs, readings, prayer and other items; export a text outline.
- Export and restore validated JSON backups, including backups from the original four-song version. Existing personal reviews, libraries and plans survive catalog expansion.

Catalog assessments are **editorial starter drafts under a Baptist/Reformed-friendly baseline**, not AI output, live research or a verified consensus. The statement presets are short working summaries, not reproductions of full confessions. Different profiles do not silently rewrite existing catalog judgments. Musical findings and arrangement time remain unassessed until evidence is supplied. Default durations are planning estimates.

## AI-content preferences

Preferences are personal to each profile/account; full AI content is the default for existing profiles.

- **Human reviews only:** hide AI drafts, ratings and assistance. Show human assessments and editorial catalog notes. No AI requests are sent from this mode.
- **AI observations only:** show limited text/arrangement assistance, without AI theological scores, Scripture proposals or recommendations. Assistance is stored separately and does not replace your assessment.
- **Full AI content:** display AI draft reviews, ratings and suggestions. Applying a draft requires an explicit action; church approval is always a human decision.

Changing visibility preserves the underlying reviews. A profile in human-only mode may show its previous human review or the editorial catalog baseline instead of an AI draft. Its personal notes, arrangement settings and approval decision remain visible. Restoring full content brings the retained AI draft back.

The public GitHub Pages edition has no live AI backend. To draft with AI locally, use Node 22+ and configure a server-side `WORSHIP_AI_KEY` and optional `WORSHIP_AI_MODEL` (default `gpt-4.1-mini`). Never publish this credential. Requests use `https://api.openai.com/v1/chat/completions` and analyze supplied text, not web search. Supply only song text you have permission to use. Lyrics are not retained in workspace storage. Limited assistance is restricted on both client and server. A live provider review has not yet been validated.

## Accounts: integration prepared, service configuration pending

The website contains email signup/sign-in, confirmation-link handling, password recovery, refresh and sign-out flows for Supabase. These controls remain unavailable until a real project is configured; they do not simulate a working login.

When configured:

- Profile choices automatically save to the account and load on sign-in. This includes denomination, faith statement, custom review parameters and AI-content preference.
- Browser workspaces are separate for guests and each signed-in user. Signing out returns to the guest workspace.
- Account workspace backups are explicit. **Save account backup** uploads/replaces the account's saved repertoire and plans. **Load account backup** requires confirmation before replacing local data. This is not automatic live collaboration or conflict-free multi-device editing.
- **Copy browser workspace** transfers the guest workspace into the signed-in account with confirmation. Use **Sync my profile** to retry a failed preference save.
- Access and refresh tokens are kept in session storage, outside workspace JSON. Workspace exports contain no sign-in credentials.

### Configure a new Supabase project

1. Create a project at https://supabase.com/dashboard. Keep the database password private; this app does not need it in the browser.
2. In the SQL editor, run [supabase/schema.sql](supabase/schema.sql). It creates `profiles` and `workspaces` with owner-only row-level security and denies anonymous access.
3. Under Authentication, enable email signup and keep email confirmation enabled. Set the Site URL to `https://williambooth0803-ui.github.io/Worship-Song-Tool/` and allow that exact URL as a redirect. Configure an email delivery provider when needed for production email traffic.
4. Configure the project's **public** URL as `SUPABASE_URL` and **publishable** key as `SUPABASE_PUBLISHABLE_KEY`. A legacy anon key is also supported. Use environment settings for these values; never use a secret or service-role key in frontend configuration. The build rejects those privileged key types.
5. Run `npm run build:site` with both settings present, then commit the generated `docs/` files and push. They contain only public browser-safe project settings. The local Node server also accepts these environment variables. Alternatively, the public settings can be maintained in `public/config.js` before a build.
6. Validate real signup/confirmation, password recovery, profile persistence, cross-account isolation and workspace backups against the deployed project. Client tests with a fixture do **not** establish deployed database security or successful email delivery.

A project/account has not yet been provisioned for this repository. Management credentials, provider connectivity, production email delivery and live row-level-security checks remain unverified. Keep the account controls disabled until configuration is complete.

## Development and checks

Requires Node.js 22 or later. No third-party runtime dependencies or bundler.

```sh
npm ci
npm start
```

Open the app on port 3000. `PORT` overrides it; `npm run dev` watches server changes. Processes must restart after cloud environment restoration. The development server permits embedded previews; deployments can set `FRAME_ANCESTORS="'none'"` or trusted parent origins.

```sh
npm test
npm run test:hosted
# With npm start running:
npm run test:browser
```

`test:hosted` builds the GitHub Pages edition and starts a temporary local server under the repository path. It checks restoration, guided profiles, approval rules, mobile layout and a simulated account service with isolated users and synced profiles. `test:browser` covers reviews, multiple libraries, plans and a simulated AI draft. Neither fixture is a real provider integration test. Chromium is expected at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another executable. `APP_URL` overrides the development test address.

The static export has no secrets, personal browser notes or supplied lyrics. Without a configured account, data stays in this browser. Clearing site data removes it; use **Backup & restore** for a copy. Restoring replaces the current workspace only after validation and confirmation; invalid files and cancellation preserve existing data. Backups are limited to 5 MB.

Before deploying a paid AI backend for multiple users, add authenticated requests, authorization and rate limits. The current Node backend is for personal/local development. The app does not yet retrieve licensed lyrics, analyze scores/audio, offer a 1,000-song AI catalog, or coordinate shared church approvals across multiple users.

## Cloud tasks

Use the existing isolated checkout at `/workspace/Worship-Song-Tool`; no worktree is needed. Install with `npm ci`, run `npm test`, start with `npm start`, and validate `/api/status` plus the browser workflow. Manual reviewing/planning needs no credentials. Account integration requires the public project settings and deployed SQL; AI drafting separately requires a private server-side API credential.
