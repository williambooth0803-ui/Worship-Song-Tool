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

## Song index

The **Song index** is a deterministic reference, not a recommendation engine.
Combine whole-word, phrase, exact-value, missing-value and numeric filters across
song words, themes, keys, Scripture connections, scores, musical details, notes,
libraries and custom metrics. Browse an alphabetical concordance with song counts,
choose a metric column, sort, and export current results as CSV.

**Edit index details** records tune, meter, tempo, time signature, vocal range,
difficulty, instruments, language, tags and optional song words. Custom text or
numeric metrics extend the index. These details are human-entered. Without full
words the concordance covers only the opening line, which is labeled in the UI.
Text/theme changes require a fresh church-use approval.

**AI criteria search** is an explicit, optional lookup within a selected personal
library (1–100 songs). It requires Full AI content and the private local AI service.
The provider evaluates supplied record excerpts only and returns tentative matches,
reasons, and exact supporting snippets. Invalid IDs or invented quotations reject
the response. Results are temporary and never change metrics, reviews, approval,
or worship plans. The public static website has no connected AI service yet.

A future read-only ChatGPT app connection is described in
[CHATGPT-CONNECTION.md](CHATGPT-CONNECTION.md). It requires a deployed HTTPS MCP
backend and per-user authorization; it is not installed or available yet.
[DESIGN.md](DESIGN.md) records the user's design and human-planning boundaries.

## AI-content preferences

Preferences are personal to each profile/account; full AI content is the default for existing profiles.

- **Human reviews only:** hide AI drafts, ratings and assistance. Show human assessments and editorial catalog notes. No AI requests are sent from this mode.
- **AI observations only:** show limited text/arrangement assistance, without AI theological scores, Scripture proposals or recommendations. Assistance is stored separately and does not replace your assessment.
- **Full AI content:** display AI draft song assessments and ratings. Explicit subjective library searches are optional. Worship planning remains human-led. Applying a draft requires an explicit action; church approval is always a human decision.

Changing visibility preserves the underlying reviews. A profile in human-only mode may show its previous human review or the editorial catalog baseline instead of an AI draft. Its personal notes, arrangement settings and approval decision remain visible. Restoring full content brings the retained AI draft back.

The public GitHub Pages edition has no live AI backend. To draft with AI locally, use Node 22+ and configure a server-side `WORSHIP_AI_KEY` and optional `WORSHIP_AI_MODEL` (default `gpt-4.1-mini`). Never publish this credential. Requests use `https://api.openai.com/v1/chat/completions` and analyze supplied text, not web search. Supply only song text you have permission to use. Text supplied only for a review request is not retained. Words explicitly entered in Index details are stored in workspace backups and account saves. Limited assistance is restricted on both client and server. A live provider review has not yet been validated.

## Accounts: Supabase connection configured

The website contains email signup/sign-in, confirmation-link handling, password recovery, refresh and sign-out flows for Supabase. The public website is configured with the supplied Supabase public project settings. The user has run the schema and confirmed sign-in.

When configured:

- Profile choices automatically save to the account and load on sign-in. This includes denomination, faith statement, custom review parameters and AI-content preference.
- Browser workspaces are separate for guests and each signed-in user. Signing out returns to the guest workspace.
- Account workspace backups are explicit. **Save account backup** uploads/replaces the account's saved repertoire and plans. **Load account backup** requires confirmation before replacing local data. A visible status distinguishes browser storage from account saves. Conditional writes stop when another device has saved a newer copy. Existing account copies are detected at sign-in and can be reviewed before loading. This is not automatic live collaboration.
- **Copy browser workspace** transfers the guest workspace into the signed-in account with confirmation. Use **Sync my profile** to retry a failed preference save.
- Access and refresh tokens are kept in session storage, outside workspace JSON. Workspace exports contain no sign-in credentials.

### Configure a new Supabase project

1. Create a project at https://supabase.com/dashboard. Keep the database password private; this app does not need it in the browser.
2. In the SQL editor, run [supabase/schema.sql](supabase/schema.sql). It creates `profiles` and `workspaces` with owner-only row-level security and denies anonymous access.
3. Under Authentication, enable email signup and keep email confirmation enabled. Set the Site URL to `https://williambooth0803-ui.github.io/Worship-Song-Tool/` and allow that exact URL as a redirect. Configure an email delivery provider when needed for production email traffic.
4. Configure the project's **public** URL as `SUPABASE_URL` and **publishable** key as `SUPABASE_PUBLISHABLE_KEY`. A legacy anon key is also supported. Use environment settings for these values; never use a secret or service-role key in frontend configuration. The build rejects those privileged key types.
5. Run `npm run build:site` with both settings present, then commit the generated `docs/` files and push. They contain only public browser-safe project settings. The local Node server also accepts these environment variables. Alternatively, the public settings can be maintained in `public/config.js` before a build.
6. Validate real signup/confirmation, password recovery, profile persistence, cross-account isolation and workspace backups against the deployed project. Client tests with a fixture do **not** establish deployed database security or successful email delivery.

User sign-in is confirmed; provider-fixture account flows are tested. Real signed-in workspace writes and cross-account row isolation have not been independently verified by the development environment. Production email delivery and recovery still need live validation.

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

The published static site has no private credentials or personal workspace data. Stored index words and notes belong to browser/account workspaces and their backups. Without a configured account, data stays in this browser. Clearing site data removes it; use **Backup & restore** for a copy. Restoring replaces the current workspace only after validation and confirmation; invalid files and cancellation preserve existing data. Backups are limited to 5 MB.

Before deploying a paid AI backend for multiple users, add authenticated requests, authorization and rate limits. The current Node backend is for personal/local development. The app does not yet retrieve licensed lyrics, analyze scores/audio, offer a 1,000-song AI catalog, or coordinate shared church approvals across multiple users.

## Cloud tasks

Use the existing isolated checkout at `/workspace/Worship-Song-Tool`; no worktree is needed. Install with `npm ci`, run `npm test`, start with `npm start`, and validate `/api/status` plus the browser workflow. Manual reviewing/planning needs no credentials. Account integration requires the public project settings and deployed SQL; AI drafting separately requires a private server-side API credential.
