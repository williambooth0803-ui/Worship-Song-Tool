# Faithful Repertoire

A worship-planning workspace for choosing songs with sound doctrine, meaningful lyrics, clear English and purposeful use of service time.

The public website is hosted at https://williambooth0803-ui.github.io/Worship-Song-Tool/. GitHub Pages publishes `main` → `/docs`; regenerate and commit those files after frontend changes.

[Project links](PROJECT-LINKS.md) collects the website, repository, Supabase dashboard and deployment shortcuts.

## Current workflow

- Build a profile from the prominent setup prompt: denomination, a named statement-of-faith starting point, custom convictions and personal AI-content visibility.
- Start with 69 mixed hymn, modern hymn, worship, CCM and gospel records. Browse 2,044 song/version records across 58 collections, including all 40 requested artists plus Elevation RHYTHM and Red Rocks Worship. Expand a collection to browse paginated song rows and actions: library, plan, blacklist, files, arrangement, human evaluation, AI evaluation and details. Filter collections by artist, era, style or theme. **Import all songs** imports a whole collection without selecting checkboxes; **Import entire catalog** does the same for every visible record. Essentials, Standards and All remain available. These are editorial selections, not complete verified discographies or rankings.
- Search ranks matching titles ahead of author/theme matches. With no text matches, it keeps the no-matches message and lists the closest title/artist spellings below it. Library searches stay within the chosen library. Opening a catalog record does not add it to a library. Filter by song type, assessment status, theme and church-use decision.
- **Blacklist** dismisses a song record from discovery, libraries, collections, index and new song choices. Existing service items retain their position and duration but display a generic placeholder. The blacklist tab permits restoration. Notes, arrangements, attachments, library membership and history are preserved; repeated imports do not restore dismissed records. Blacklist flags sync and survive validated backups, and the read-only connection excludes them.
- Use **Find lyrics** or **Find public reviews** for a title-and-recording-specific web search. These are search links, not a claim that a verified review or licensed lyric page exists for every title.
- **Listen · recordings** provides Apple Music, Spotify and YouTube searches for every catalog record. **Manage recording links** saves exact song/video URLs with version labels; the first saved version per platform becomes its preferred button. Searches remain available to find alternate recordings. Links are validated and normalized, not verified for song identity, availability or official status. No audio is downloaded or analyzed. Saved links travel with workspace backups and explicit account saves. The catalog does not yet contain verified direct recordings for every song.
- Edit assessments, personal notes, Scripture connections, source links, arrangement observations, key and duration.
- Compare your current review with the separately preserved catalog assessment.
- Mark songs as not reviewed, approved, approved with context or to avoid. Context/avoid decisions require reasoning; approving requires acknowledgement of the exact version and concerns. Changes to the assessment require fresh approval. Avoided songs require reconsideration before being added to a plan.
- Save songs to multiple libraries; rename them, import/export CSV title lists, or delete a library while keeping its song records. Build and reorder services with songs, readings, prayer and other items; duplicate an independent draft, export a timed text outline, or print/save a PDF. Completed services supply recorded song-use history. Save your own service orders as templates, optionally replacing selected songs with manually filled placeholders; create independent, dated drafts from them. Templates do not count as services or recorded song use.
- Export and restore validated JSON backups, including backups from the original four-song version. Existing personal reviews, libraries and plans survive catalog expansion.

279 catalog records have **prewritten AI draft ratings** based on general model knowledge. The other 1,765 are finding-aid records with null ratings and empty assessment fields. No ratings, themes or Scripture connections are invented from a title alone. Drafts are provisional, not a lyric-by-lyric verification, live web research or a verified consensus. Exact versions and recording associations must be checked. Artist associations identify versions rather than exhaustive songwriting credits; inclusion never implies church approval. Time and musical findings remain unassessed without arrangement evidence. Default durations are planning estimates. Profile presets are short working summaries and do not silently rewrite saved judgments.

**Generate AI evaluation** uses the user's ChatGPT account without paid API billing:

1. Review and copy the song-specific request, then paste it into ChatGPT. Full mode includes the account's review principles and weights; limited mode requests objective observations only. Personal song notes, lyrics, account credentials, libraries and plans are not included automatically.
2. Paste ChatGPT's JSON response back into the dialog and preview its ratings, observations and supplied sources. The importer checks the song ID, AI mode, score ranges, list/text limits and safe source URLs. Source links and theological claims still need human verification.
3. Apply the draft explicitly. A human evaluation stays primary; the new AI draft is stored separately without changing the human assessment or its approval. Without a human assessment, it becomes the primary AI draft and resets approval. Personal notes, key, duration, musical observations and custom attributes are preserved. Limited observations are separate. Human-only mode hides this action. Editing the response invalidates its preview; account/profile/song changes block stale application.

The read-only ChatGPT connection cannot write an evaluation back to the website. This copy/preview/apply workflow is deliberate; evaluating a song does not recommend songs or build a service plan.

AI Labels default **On** and can be switched off in More or Rating profile. Badges mark generated ratings, summaries, themes and interpretive details, including unchanged AI fields carried into an edited assessment. Human notes and arrangement observations are separate. This label preference does not change AI visibility. Human-only/limited modes suppress subjective drafts, including index/export and connector output.

Song details use one collapsed **AI evaluation** box, rather than separate expandable panels for every subjective field. A human evaluation occupies the primary spot; retained AI content is a smaller collapsed option at the bottom. Saving the first human evaluation asks whether to keep or delete the AI version. Deleting it is respected through catalog refreshes. Older drafts with a previous human assessment migrate to this layout. **Customize details** hides or reorders sections inside the evaluation; custom text/number attributes still participate in indexing. Empty musical/language/time fields and vague topical Scripture connections are omitted. Kari Jobe's Forever record retains the owner's personal concern about the grave-battle line.

Objective details are plain text: attribution, populated key/tempo/duration and other recorded measurements. Missing values are omitted. Recording associations from model knowledge and default durations are marked **Guess** or **Estimate**. Their **Confirm** and **Edit** controls let the owner verify or correct a value without creating a theological evaluation. Fact provenance can also mark a value as an AI estimate. No keys, tempos, ranges or exact release years are inferred from titles; era collections do not populate release-year metadata.

**Files** accepts up to 50 attachments per song, each up to 10 MB. Signed-in uploads use a private Supabase bucket with owner-folder policies that deny read-only OAuth access. Guest uploads use IndexedDB on this device. Workspace JSON contains references, never file bytes or credentials; export/download important files separately. Account file references can only be downloaded by their owner. Run `supabase/files.sql` to provision storage (the deployment workflow includes it).

## Song index

The **Song index** is a deterministic reference, not a recommendation engine.
Combine whole-word, phrase, exact-value, missing-value and numeric filters across
song words, themes, keys, Scripture connections, scores, musical details, notes,
libraries and custom metrics. Browse an alphabetical concordance with song counts,
choose a metric column, sort, and export current results as CSV. Save a named view to
reuse its search, combined filters, sort order and additional column. Apply, update,
rename or delete views under **Saved views**. Views recompute results from the current
records and respect the current AI visibility; they store no cached assessments.
Views and service templates are included in JSON backups and explicit account saves.
Old backups remain supported.

**Edit index details** records tune, meter, tempo, time signature, vocal range,
difficulty, instruments, language, tags and optional song words. Custom text or
numeric metrics extend the index. These details are human-entered. Arrangement records store selected-key vocal bounds, jumps, instrumental difficulty, durations, and observed wordless/instrumental seconds. Pitch spans are calculated from supplied note names, never inferred from lyrics. Arrangement measurements in the index use the preferred arrangement; All arrangement keys is a separate index field. Without full
words the concordance covers only the opening line, which is labeled in the UI.
Text/theme changes and preferred-arrangement changes require a fresh church-use approval. Local text counts make “just,” interior “just,” “oh,” unique words and repeated lines searchable without AI; counts are observations, not automatic quality penalties. Song-use history distinguishes saved plans from services explicitly marked completed.

**AI criteria search** is an explicit, optional lookup within a selected personal
library. With Full AI content, the public website prepares a request you can copy
into your connected ChatGPT conversation. The request contains only the library's
name/ID and your criterion; ChatGPT retrieves saved account records using your
connection permissions. Sign in and save your library first. Results stay in
ChatGPT and do not change ratings, custom metrics, approval or worship plans.
No OpenAI API key or paid API billing is required for this route.

An optional private local AI service can still evaluate supplied record excerpts
for 1–100 songs and return tentative matches with exact supporting snippets.
Invalid IDs or invented quotations reject its response. The public static website
does not call that service.

The read-only ChatGPT connection is deployed and documented in
[CHATGPT-CONNECTION.md](CHATGPT-CONNECTION.md). Public discovery/authentication checks
pass, and the project owner confirmed that ChatGPT correctly listed their saved
libraries after authorizing the connection. Each additional user must authorize
their own account. It requires no paid OpenAI API billing.
[DESIGN.md](DESIGN.md) records the user's design and human-planning boundaries.

## Collection imports and scale

Fifty-eight editorial selections, including 42 artist/recording collections, cover mixed Baptist repertoire, Baptist hymn selections,
modern hymns, contemporary worship, CCM/choruses, gospel, Presbyterian/Reformed hymn
selections, Advent/Christmas and cross/resurrection titles. Essentials, Standards
and All are nested depth levels with exact preview counts. Import individual
selected titles into a new or existing library. Overlapping/repeated imports reuse
matching records and keep personal assessments, notes, arrangements and approval.
Import history survives JSON backups and account saves. Selections are not ranked
charts or official denomination/hymnal lists; a sourced Top 500 list remains future work.

CSV title lists support Title/Song Title, Attribution/Writer, Themes and Preferred
Key. Files are previewed, accept quoted commas/newlines and are limited to 1 MB /
1,000 rows. They transfer title records, not complete personal reviews; use JSON
backups for complete workspace migration. Imported records keep their selected text
version separate when attributions differ.

Discovery renders 24 songs per page; the index renders 50 and exports every matching
result. History lookup and repeated text calculations are cached during indexing.
`npm run test:scale` verifies 1,000 synthetic songs and 1,000 plans; these fixtures
are not catalog entries or precomputed AI reviews. The account database still stores
owner-scoped JSON workspaces, with a 5 MB backup-file limit and browser storage quotas.
Larger shared catalogs/real-time collaboration will need normalized shared song,
version/analysis and owner-review tables rather than increasingly large workspace blobs.

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
- Access and refresh tokens persist in local storage, outside workspace JSON, so sign-in survives new tabs and return visits in this browser profile. Sign-in/out events synchronize across tabs; refreshes use a browser lock when available. A temporary provider outage preserves the session. This does not sign into other browsers or devices automatically. Workspace exports contain no sign-in credentials. Login forms use stable input IDs, username/current-password autocomplete and no sign-in password-length restriction; actual Apple Passwords behavior still requires validation on Safari or the extension.

### Configure a new Supabase project

1. Create a project at https://supabase.com/dashboard. Keep the database password private; this app does not need it in the browser.
2. In the SQL editor, run [supabase/schema.sql](supabase/schema.sql). It creates `profiles` and `workspaces` with owner-only row-level security and denies anonymous access and OAuth token writes. Run supabase/mcp.sql separately for the read-only connector.
3. Under Authentication, enable email signup and keep email confirmation enabled. Set the Site URL to `https://williambooth0803-ui.github.io/Worship-Song-Tool/` and allow that exact URL as a redirect. Configure an email delivery provider when needed for production email traffic.
4. Configure the project's **public** URL as `SUPABASE_URL` and **publishable** key as `SUPABASE_PUBLISHABLE_KEY`. A legacy anon key is also supported. Use environment settings for these values; never use a secret or service-role key in frontend configuration. The build rejects those privileged key types.
5. Run `npm run build:site` with both settings present, then commit the generated `docs/` files and push. They contain only public browser-safe project settings. The local Node server also accepts these environment variables. Alternatively, the public settings can be maintained in `public/config.js` before a build.
6. Validate real signup/confirmation, password recovery, profile persistence, cross-account isolation and workspace backups against the deployed project. Client tests with a fixture do **not** establish deployed database security or successful email delivery.

User sign-in and a real ChatGPT lookup of the owner’s saved libraries are confirmed; provider-fixture account flows, including saved views and templates, are tested. Production cross-account row isolation has not been independently verified with two real accounts by the development environment. Production email delivery and recovery still need live validation.

## Development and checks

Requires Node.js 22 or later. The browser stays vanilla JavaScript without a bundler. The MCP backend uses pinned official MCP SDK, JOSE and Zod dependencies.

```sh
npm ci
npm start
```

Open the app on port 3000. `PORT` overrides it; `npm run dev` watches server changes. Processes must restart after cloud environment restoration. The development server permits embedded previews; deployments can set `FRAME_ANCESTORS="'none'"` or trusted parent origins.

```sh
npm test
npm run test:hosted
npm run test:scale
npm run check:mcp
# With npm start running:
npm run test:browser
```

`test:hosted` builds the GitHub Pages edition and starts a temporary local server under the repository path. It checks restoration, guided profiles, approval rules, AI labels, customizable/collapsible details, OAuth consent, mobile layout and a simulated account service with isolated users and synced profiles. It also checks typo alternatives, library scope, lyric/review links and the ChatGPT evaluation import, including preview-only behavior, escaping, preserved notes and AI visibility modes. `test:browser` covers reviews, multiple libraries, plans and a simulated AI draft. It also exercises collection imports, CSV/library management, arrangements, plan copies, print/PDF output and completed-use history. These fixtures are not real provider integration tests. Chromium is expected at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another executable. `APP_URL` overrides the development test address.

The published static site has no private credentials or personal workspace data. Stored index words and notes belong to browser/account workspaces and their backups. Without a configured account, data stays in this browser. Clearing site data removes it; use **Backup & restore** for a copy. Restoring replaces the current workspace only after validation and confirmation; invalid files and cancellation preserve existing data. Backups are limited to 5 MB.

Before deploying a paid AI backend for multiple users, add authenticated requests, authorization and rate limits. The current Node backend is for personal/local development. The app does not yet retrieve licensed lyrics, analyze scores/audio, offer a verified 1,000-song AI catalog, or coordinate shared church approvals across multiple users.

The GitHub **App checks** workflow runs unit, scale and hosted browser checks on main pushes and pull requests, then verifies committed Pages output matches the build. Tests require no live AI credentials.

## Cloud tasks

Use the existing isolated checkout at `/workspace/Worship-Song-Tool`; no worktree is needed. Install with `npm ci`, run `npm test`, start with `npm start`, and validate `/api/status` plus the browser workflow. Manual reviewing/planning needs no credentials. Account integration requires the public project settings and deployed SQL; AI drafting separately requires a private server-side API credential.
