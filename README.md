# Faithful Repertoire

A workspace helping worship leaders think deeply about the words they lead, with practical tools for evaluation, libraries and human-created plans.

The Cloudflare website is https://faithful-repertoire.pages.dev/. Cloudflare reports a successful Git-connected deployment, and the owner confirmed that the site and existing account sign-in work. The original https://williambooth0803-ui.github.io/Worship-Song-Tool/ remains available for existing browser-only data and the current ChatGPT consent flow. Both hosts serve the `docs` build from `main`; regenerate and commit those files after frontend changes.

[Project links](PROJECT-LINKS.md) collects the website, repository, Supabase dashboard and deployment shortcuts.

[Cloudflare Pages setup](CLOUDFLARE-SETUP.md) documents the Git-connected build,
Node 24 selection, account redirects and saved-work migration. The current GitHub
site remains available for browser-data migration and the existing ChatGPT consent flow; Cloudflare email-link redirect configuration still needs the dashboard addition described in the setup guide.

## Navigation and public About

The primary flow is **Discover → Evaluate → Libraries → Plans**. Discover groups
Songs and Collections; Evaluate keeps the song workspace, advanced Song index and
Evaluation criteria together. Criteria visits preserve the selected song and
search. No Approval belongs to Libraries and retains the compatible exclusion
flags and restoration data. Settings opens from the top-right gear, including on
mobile. [About](https://williambooth0803-ui.github.io/Worship-Song-Tool/#about) is
public before sign-in and never opts a visitor into browser-only work. A prominent About link is available in the header and on the sign-in page.

Song evaluation focuses on the words. Unless explicitly overridden, the ChatGPT
request identifies the widely recognized worship song with that title and its
usual text, states assumptions and assesses only supported evidence. The optional
song/text/version override shares only what the user enters there. Changing it
clears a pasted response/preview and rotates the request ID, so an older response
cannot be applied to the new text. Human assessments remain primary.
Modern Hymns are contemporary worship/CCM songs with hymn-like style; automatic
Hymnary finding links apply only to Traditional hymns.

## Current workflow

Sign-in is the default entry. Personal is your private workspace; the existing
browser-only copy stays separate and requires an explicit choice to use it.
The **Workspace** selector opens Personal, your organizations, and invitations.
Organizations share their own songs, libraries, evaluations, files and plans.
Owners control ownership and deletion; administrators manage editors and viewers;
editors change shared content, while viewers browse/download without shared writes.
Create a separate organization rather than sharing a password. Invitations are
bound to a verified email, expire after 14 days and require explicit acceptance.
The existing Supabase email provider sends a native sign-in link; organization
membership is granted only after the recipient signs in and accepts. Delivery
errors keep the invitation available for retry or a copied link.

Shared updates are checked every three seconds while visible, with an immediate
check after reconnecting or returning to the tab. Revision checks protect writes.
Independent edits merge; overlapping edits pause for review and retain the local
copy. Switching, revoked membership and changed permissions keep unsynced drafts
private in this browser. Settings provides draft downloads. Actual email delivery
and real-user offline recovery still require production verification. Read-only
configuration inspection confirmed no custom SMTP host/sender is configured
and the custom email hook is disabled;
production invitation delivery still needs provider setup and a real delivery test.

Browser changes save after each action. Account uploads use a serialized queue;
offline errors preserve the browser copy and newer account copies require review.
The page-leaving warning covers pending uploads and unsubmitted forms. Storage,
network and browser shutdown failures cannot be guaranteed away; keep backups.
Settings uses grouped rows, with advanced account tools below. Saved sign-in
checks show progress, offer a saved-copy option after four seconds and stop after
twelve. Expired sessions return to the working autofill-compatible sign-in form.
Per-account AI visibility and labels still apply when viewing an organization;
shared rating criteria and church context belong to that organization. The
read-only ChatGPT connection continues to read Personal, not organization data.

[Request ledger](REQUESTS.md) tracks all outstanding owner requests and external
verification needs. [Scoring guide](SCORING-GUIDE.md) explains 0–10 anchors,
evidence rubrics, selectable/custom criteria, equal weighting and library balance.


- Build a profile from the prominent setup prompt: denomination, a named statement-of-faith starting point, custom convictions and personal AI-content visibility.
- Start with 69 mixed hymn, modern hymn, worship, CCM and gospel records. Browse 835 song/version records across 58 collections, including all 40 requested artists plus Elevation RHYTHM and Red Rocks Worship. Browse a mixed, visual collection grid sorted by editorial relevance or name. Themed collections have distinctive names and descriptive subtitles, with album artwork and attributed artist photos where available. Expand a collection to browse paginated song rows and actions: library, plan, blacklist, files, arrangement, human evaluation, AI evaluation and details. Filter collections by artist, era, style or theme. **Import all songs** imports a whole collection without selecting checkboxes; **Import entire catalog** does the same for every visible record. Essentials, Standards and All remain available. These are editorial selections, not complete verified discographies or rankings.
- Search ranks matching titles ahead of author/theme matches. With no text matches, it keeps the no-matches message and lists the closest title/artist spellings below it. Library searches stay within the chosen library. Opening a catalog record does not add it to a library. Filter by song type, evaluation status and theme.
- Discover opens with the highest visible ratings first, using your active criteria
  and AI-content preference, with unassessed records last. Typed searches keep
  exact/title matches first and apply the chosen order within each relevance group.
  Libraries and No Approval have independent sort choices. Compact result rows keep
  artwork, title/attribution, evaluation status and rating together in one narrow column.
- **No Approval** dismisses a song record from discovery, libraries, collections, index and new song choices. Existing service items retain their position and duration but display a generic placeholder. The blacklist tab shows full song details, recordings and evaluations, with restoration available. It does not offer library or plan additions while a song is blacklisted. Notes, arrangements, attachments, library membership and history are preserved; repeated imports do not restore dismissed records. Blacklist flags sync and survive validated backups, and the read-only connection excludes them.
- Use **Find lyrics** or **Find public reviews** for a title-and-recording-specific web search. These are search links, not a claim that a verified review or licensed lyric page exists for every title.
- **Listen · recordings** provides Apple Music, Spotify and YouTube searches for every catalog record. **Manage recording links** saves exact song/video URLs with version labels; the first saved version per platform becomes its preferred button. Searches remain available to find alternate recordings. Links are validated and normalized, not verified for song identity, availability or official status. No audio is downloaded or analyzed. Saved links travel with workspace backups and account autosave. The catalog now supplies a first batch of Apple Music recordings matched against exact title/artist metadata from Apple’s US catalog, with album labels and retained source evidence. These defaults never replace a personal recording list or restore removed links. Matching metadata does not verify lyrics, official status or availability in every region. Spotify and YouTube remain searches until source-backed direct mappings are available; Songlink currently rejects anonymous lookup with `PUBLIC_API_ACCESS_DEPRECATED`. See [Recording lookup access](RECORDING-LOOKUP-ACCESS.md) for coverage and reproducible lookup steps.
- Edit assessments, personal notes, Scripture connections, source links, arrangement observations, key and duration.
- Compare your current review with the separately preserved catalog assessment.
- Evaluate and organize songs in your own libraries. Use your own libraries to record readiness and conditions for use. Optional starter libraries provide Ready to use, Needs evaluation, Use with context and Not for our church. Previous decisions/notes are retained and can be copied into those libraries explicitly; evaluations do not reclassify songs or block human plan choices.
- Save songs to multiple libraries; rename them, import/export CSV title lists, or delete a library while keeping its song records. Build and reorder services with songs, readings, prayer and other items; duplicate an independent draft, export a timed text outline, or print/save a PDF. Completed services supply recorded song-use history. Save your own service orders as templates, optionally replacing selected songs with manually filled placeholders; create independent, dated drafts from them. Templates do not count as services or recorded song use.
- Export and restore validated JSON backups, including backups from the original four-song version. Existing personal reviews, libraries and plans survive catalog expansion.

All 835 retained catalog records have expanded lyric-based AI draft evaluations with reasons for accuracy, substance and language, themes, brief cited wording concerns and complete KJV comparisons. This includes all 69 starter songs and 568 records added during the whole-catalog pass. The owner approved discarding the 24 unresolved defaults; they are retired from discovery and collections, while copies already saved in workspaces remain intact. The owner subsequently retired another 141 from the 150-song shortlist, retaining two named exceptions and seven rated above 8.5 for review. [The identity audit](data/catalog-analysis/identity-issues.json) retains their historical candidate references and retirement disposition. Human judgments and saved data are preserved. [Coverage](data/catalog-analysis/coverage.json), [analysis method](data/catalog-analysis/README.md) and [catalog selection](data/catalog-selection/README.md) document the scope. Reasons appear first, with source/version details in a disclosure. Missing arrangement evidence stays unknown.

[Shortlist flashcards](https://williambooth0803-ui.github.io/Worship-Song-Tool/review.html)
are also linked from Collections. They open on the seven retained songs awaiting
review, with the owner's original 150 decisions recorded. Keep, Remove and Decide
later choices, notes, undo and keyboard controls save in this browser. Download a
JSON backup to keep a copy or move devices; restore merges newer choices. CSV and
Copy decisions provide a reviewable catalog-update request. This public tool uses
catalog AI ratings with a hide option, stays separate from personal lenses and
never changes saved workspace data or publishes new removals automatically.

**Generate AI evaluation** uses the user's ChatGPT account without paid API billing:

1. Review and copy the song-specific request, then paste it into ChatGPT. Full mode includes the account's review principles and weights; limited mode requests objective observations only. Personal song notes, lyrics, account credentials, libraries and plans are not included automatically.
2. Paste ChatGPT's JSON response back into the dialog and preview its ratings, observations and supplied sources. The importer checks the song ID, AI mode, score ranges, list/text limits and safe source URLs. Source links and theological claims still need human verification.
3. Apply the draft explicitly. A human evaluation stays primary; the new AI draft is stored separately without changing the human assessment or library membership. Without a human assessment, it becomes the primary AI draft; previous church-use decisions are archived, not deleted. Personal notes, key, duration, musical observations and custom attributes are preserved. Limited observations are separate. Human-only mode hides this action. Editing the response invalidates its preview; account/profile/song changes block stale application.

The read-only ChatGPT connection cannot write an evaluation back to the website. This copy/preview/apply workflow is deliberate; evaluating a song does not recommend songs or build a service plan.

AI Labels default **On** and can be switched off in Settings or Evaluation criteria. Badges mark generated ratings, summaries, themes and interpretive details, including unchanged AI fields carried into an edited assessment. Human notes and arrangement observations are separate. This label preference does not change AI visibility. Human-only/limited modes suppress subjective drafts, including index/export and connector output.

Album covers come from exact Apple title/artist recording matches: 1,245 recording artwork URLs for 780 records. Traditional hymns remain text-only. Personal recording lists, removals and preferred ordering stay intact. Traditional hymns include a title-bound **Find hymn on Hymnary** search. Artist/attribution text can be edited directly with its pencil, Enter/Save and Escape/Cancel. Unmatched artwork remains blank.

**Analysis lenses** keep independent criteria, weights, purpose and song evaluations for different settings. Use the top-bar selector on Discover, Evaluate, Libraries or Plans; create or rename a lens in Evaluation criteria. A new lens copies the active evaluations as a starting point. Later edits stay in that lens. Personal notes, keys, arrangements, recordings, approvals, library membership and plan order are shared. AI visibility preferences remain global. Backups and account/shared workspace saves include all lenses. Explicit song, library and plan requests carry the active lens; changing it invalidates a prepared report. Existing work becomes Main lens without losing assessments.

Song pages have **Details & files**, **Outside links** and **Evaluation** tabs. The heading has a primary **Add to library** / **Manage libraries** action; secondary controls live in the **…** menu. Outside links groups recordings, lyric/public-review searches and evaluation sources. Files are listed with **Manage files** for uploads/downloads. Evaluation contains the song assessment and one collapsed **AI evaluation** box. A human evaluation occupies the primary spot; retained AI content is a smaller collapsed option at the bottom. Saving the first human evaluation asks whether to keep or delete the AI version. Deleting it is respected through catalog refreshes. Older drafts with a previous human assessment migrate to this layout. **Customize details** hides or reorders sections inside the evaluation; custom text/number attributes still participate in indexing. Empty musical/language/time fields and vague topical Scripture connections are omitted. Kari Jobe's Forever record retains the owner's personal concern about the grave-battle line.

Objective details are plain text: attribution, populated key/tempo/duration and other recorded measurements. Missing values are omitted. Recording associations from model knowledge and default durations are marked **Guess** or **Estimate**. Their **Confirm** and **Edit** controls let the owner verify or correct a value without creating a theological evaluation. Fact provenance can also mark a value as an AI estimate. No keys, tempos, ranges or exact release years are inferred from titles; era collections do not populate release-year metadata.

**Files** accepts up to 50 attachments per song, each up to 10 MB. Organization files use a separate private bucket with member/role policies. Signed-in uploads use a private Supabase bucket with owner-folder policies that deny read-only OAuth access. Guest uploads use IndexedDB on this device. Workspace JSON contains references, never file bytes or credentials; export/download important files separately. Account file references can only be downloaded by their owner. Run `supabase/files.sql` for personal storage and `supabase/organizations.sql` for shared storage. Both migrations are deployed to the existing project.

## Plan editing and import

**Plans → Add songs** opens a library picker without navigating away. Search a
library, select several songs (selection carries across libraries), and add the
selected count. Large libraries use 100-song pages with selections retained across
pages and libraries. Existing plans offer an **Add after** position; empty plans skip
placement controls. Preferred arrangements supply editable keys/duration estimates.
**Add heading** creates an untimed section label. Drag rows/handles to reorder,
including with touch, or use the accessible up/down controls. The former service
role prompt is removed; existing role text remains in backups and exports.

**Import plan** prepares a ChatGPT request for your existing Planning Center
screenshot/PDF. Attach the document in ChatGPT, copy the request, then return the
JSON response or upload its JSON file here. This is transcription of your chosen
order, not AI song selection. The request includes library song identities but no
lyrics, song notes, scores or credentials. `faithful-plan-v1` preserves headings,
songs, other items, notes, timing and date. Missing durations, ambiguous versions,
unknown songs or declared uncertainty require correction/review. A certain,
validated import saves directly without another confirmation dialog. Imported
plans are drafts; they do not count as completed use. **Plan tools → Export
importable JSON** provides a portable plan file. Full JSON workspace backups still
transfer all personal data separately. See [plan-import.js](public/plan-import.js)
for the exact format and [REQUESTS.md](REQUESTS.md) for verification limits.

## Search and collection browsing

Typing updates result regions without replacing the active search input. Indexed
identity lookups and cached normalized text avoid scanning/normalizing the same
catalog repeatedly. Native caret/selection and IME composition are preserved.
Search results use a short 60 ms coalescing delay; no network search is needed.

Collections search accepts song titles as well as artists, collection names,
styles, eras and themes. Direct matching songs open from that page. Each expanded
collection has its own song search, depth and sort controls. Essentials/Standards
retain their editorial selections; All is the complete available collection.
Song rows default to A–Z. **Popularity in your plans** counts song occurrences
only in completed plans in the current workspace, never guessed global chart
positions. **Recording release** sorts by the earliest supplied date in the
matched Apple recording links; those dates may describe reissues, not original
composition/publication. Unknown dates follow dated records. All 1,245 exact
recording links retain release-date evidence from the cached Apple responses.
**Preview & import** uses that collection's chosen depth; **Import all songs**
continues to import the entire collection. Search/sorting change the view only.

Artist/group covers use the fixed subject's Wikidata image property and Wikimedia
Commons thumbnails with accepted reuse licenses and visible attribution/source
links. Photos load only near the viewport, with two concurrent requests and
in-memory deduplication. No private song notes, account data or search terms are
sent. Unavailable images, logos/record sleeves and unverified identities retain
monogram covers. Other collection types have simple visual emblems. Production
image availability remains to be validated: the cloud configuration omits the
Wikimedia API/image hosts as well as Apple's artwork CDN. No stale environment
configuration was retried or overwritten.

The header save tracker is red with **× Unsaved changes**, amber while saving,
and green with **✓ Saved** after the current snapshot is acknowledged. Unapplied
form edits and failed/conflicting uploads remain red. Browser-only work says
**Saved on this device**; view-only organizations say **View only**. Color is
supplemented by text/icons and reduced-motion support.

**Remember me** remembers the email and persists the session in this browser.
Leave it unchecked on shared devices: sign-in stays in tab storage (including
reloads), and the email is not retained. Existing persistent sign-ins remain
compatible. Passwords are never stored by the app. **Use saved password** focuses
the native password field; the browser/password manager controls credential
suggestions and any Face ID/Touch ID challenge. The website cannot force that
challenge or substitute its own biometric prompt.

## Song index

The **Song index** is a deterministic reference, not a recommendation engine.
Combine whole-word, phrase, exact-value, missing-value and numeric filters across
song words, themes, keys, Scripture connections, scores, musical details, notes,
libraries and custom metrics. Browse an alphabetical concordance with song counts,
choose a metric column, sort, and export current results as CSV. Save a named view to
reuse its search, combined filters, sort order and additional column. Apply, update,
rename or delete views under **Saved views**. Views recompute results from the current
records and respect the current AI visibility; they store no cached assessments.
Views and service templates are included in JSON backups and account autosave.
Old backups remain supported.

**Edit index details** records tune, meter, tempo, time signature, vocal range,
difficulty, instruments, language, tags and optional song words. Custom text or
numeric metrics extend the index. These details are human-entered. Arrangement records store selected-key vocal bounds, jumps, instrumental difficulty, durations, and observed wordless/instrumental seconds. Pitch spans are calculated from supplied note names, never inferred from lyrics. Arrangement measurements in the index use the preferred arrangement; All arrangement keys is a separate index field. Without full
words the concordance covers only the opening line, which is labeled in the UI.
Previous church-use decisions are retained as history when a song changes; current readiness is organized with your libraries. Local text counts make “just,” interior “just,” “oh,” unique words and repeated lines searchable without AI; counts are observations, not automatic quality penalties. Plan History distinguishes saved plans from plans explicitly marked completed.

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
does not call that service. **Run Library Audit** in a library prepares an explicit
ChatGPT request in Full AI mode and previews a report with locally computed charts,
evidence, strengths, weaknesses and unknowns. No library, song or plan is modified.
Download the JSON report to keep it. See SCORING-GUIDE.md for its limits.

**Evaluate plan** on Plans evaluates an existing human-built order in Full AI mode.
Choose additional plans and/or libraries, activate the criteria you want, add your
own questions, and describe your purpose. Library audits also offer **Choose more
libraries / plans and criteria**. Mixed reports compare evidenced coverage in the
existing plans with the combined library content. Reports describe strengths,
gaps and uncertainty; they do not select songs, propose replacements/order, score
worship or modify any saved data. Charts count distinct library songs (deduplicated
across libraries) and plan song occurrences (including repeats), with combined
views and explicit unknowns. Keys/BPM alone cannot establish singability or energy.

Review the request before copying: chosen plans include names, themes, Scripture
context, headings/order, item titles, keys, recorded arrangement measurements and
human-entered duration estimates. Song words require opt-in; private notes, files,
song evaluations, unselected scopes, account settings and blacklisted song details
are excluded. Nothing is sent automatically. Paste the returned JSON to preview
and download a report with its snapshot. Changed scopes, criteria, evidence,
workspace/account or AI mode require a fresh request. The importer rejects extra
fields such as recommendations/scores/edits, but free-form AI prose still needs
human review; schema validation does not establish the truth of an AI observation.

Custom and active rating criteria are supported by the production connector projection. Its function was updated from `supabase/mcp.sql` while preserving existing database policies and grants. Real-user authorization still requires each account's consent.

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
result. Both have direct page entry and first/last controls. Only the results list scrolls independently. Song details use normal page scrolling,
with no separate scrollbar. Result scrolling continues onto the page at its limits.
Selection preserves the result position and brings the song heading into view on
both desktop and mobile. History lookup and repeated text calculations are cached during indexing.
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

Changing visibility preserves the underlying reviews. A profile in human-only mode may show its previous human review or the editorial catalog baseline instead of an AI draft. Its personal notes, arrangement settings and library memberships remain visible. Restoring full content brings the retained AI draft back.

The public GitHub Pages edition has no live AI backend. To draft with AI locally, use Node 22+ and configure a server-side `WORSHIP_AI_KEY` and optional `WORSHIP_AI_MODEL` (default `gpt-4.1-mini`). Never publish this credential. Requests use `https://api.openai.com/v1/chat/completions` and analyze supplied text, not web search. Supply only song text you have permission to use. Text supplied only for a review request is not retained. Words explicitly entered in Index details are stored in workspace backups and account saves. Limited assistance is restricted on both client and server. A live provider review has not yet been validated.

## Accounts: Supabase connection configured

The website contains email signup/sign-in, confirmation-link handling, password recovery, refresh and sign-out flows for Supabase. The public website is configured with the supplied Supabase public project settings. The user has run the schema and confirmed sign-in.

When configured:

- Profile choices automatically save to the account and load on sign-in. This includes denomination, faith statement, custom review parameters and AI-content preference.
- Browser workspaces are separate for guests and each signed-in user. Signing out returns to the sign-in screen; the preserved browser-only workspace requires explicit opt-in.
- Account workspace changes autosave after a short debounce. A serialized queue uploads the newest snapshot, retains edits made during a request, pauses after an offline error, and blocks conflicting writes. Settings provides **Save now / retry**. **Review saved account workspace** requires confirmation before replacing local data. A visible status distinguishes browser storage from account saves. Conditional writes stop when another device has saved a newer copy. Existing account copies are detected at sign-in and can be reviewed before loading. In Personal, a newer account copy pauses autosave until reviewed. Organization workspaces use revision checks and merge independent changes.
- **Copy browser workspace** transfers the guest workspace into the signed-in account with confirmation. Use **Retry profile sync** under advanced Settings to retry a failed preference save.
- Access and refresh tokens stay outside workspace JSON. Remember me stores the session in local storage; deselecting it uses tab storage. Remembered sign-ins survive new tabs and return visits in this browser profile. Sign-in/out events synchronize remembered sessions across tabs; refreshes use a browser lock when available. A temporary provider outage preserves the session. This does not sign into other browsers or devices automatically. Workspace exports contain no sign-in credentials. Login forms use stable input IDs, username/current-password autocomplete and no sign-in password-length restriction; the default sign-in screen now uses a stable native form, and autofilled DOM values are tested even without input events. The owner confirmed Apple saved email/password sign-in now works; automated fixtures additionally cover autofilled values without input events.

### Configure a new Supabase project

1. Create a project at https://supabase.com/dashboard. Keep the database password private; this app does not need it in the browser.
2. In the SQL editor, run [supabase/schema.sql](supabase/schema.sql). It creates `profiles` and `workspaces` with owner-only row-level security and denies anonymous access and OAuth token writes. Run supabase/mcp.sql separately for the read-only connector.
3. Under Authentication, enable email signup and keep email confirmation enabled. Set the Site URL to `https://williambooth0803-ui.github.io/Worship-Song-Tool/` and allow that exact URL as a redirect. Configure an email delivery provider when needed for production email traffic.
4. Configure the project's **public** URL as `SUPABASE_URL` and **publishable** key as `SUPABASE_PUBLISHABLE_KEY`. A legacy anon key is also supported. Use environment settings for these values; never use a secret or service-role key in frontend configuration. The build rejects those privileged key types.
5. Run `npm run build:site` with both settings present, then commit the generated `docs/` files and push. They contain only public browser-safe project settings. The local Node server also accepts these environment variables. Alternatively, the public settings can be maintained in `public/config.js` before a build.
6. Validate real signup/confirmation, password recovery, profile persistence, cross-account isolation and workspace backups against the deployed project. Client tests with a fixture do **not** establish deployed database security or successful email delivery.

User sign-in and a real ChatGPT lookup of the owner’s saved libraries are confirmed; provider-fixture account flows, including saved views and templates, are tested. Read-only probes against the deployed database verified owner-only workspace reads, exclusion of another identity, and denial of OAuth access to raw workspaces/profiles. Real-user browser isolation with two actual sign-ins remains unverified. Production email delivery and recovery still need live validation.

## Development and checks

Requires Node.js 22 or later. The browser stays vanilla JavaScript without a bundler. The MCP backend uses pinned official MCP SDK, JOSE and Zod dependencies.

Run `npm run code:count` for the running [code total](CODE-STATS.md). Site builds
refresh the file and print the total automatically; CI checks that it is current.
The main total counts physical source/support/test lines, including comments and
blank lines, and excludes the generated `docs/` website copy. Generated code is
listed separately; dependencies, Markdown, JSON/configuration data and images are
excluded. This repository cannot customize Codex's native top-right counter.

```sh
npm ci
npm start
```

Open the app on port 3000. `PORT` overrides it; `npm run dev` watches server changes. Processes must restart after cloud environment restoration. The development server permits embedded previews; deployments can set `FRAME_ANCESTORS="'none'"` or trusted parent origins.

```sh
npm test
npm run test:hosted
npm run test:scale
node scripts/request-regression.mjs # With npm start running
npm run check:mcp
# With npm start running:
npm run test:browser
```

`test:hosted` builds the GitHub Pages edition and starts a temporary local server under the repository path. It checks restoration, guided profiles, preserved historical decisions and optional starter libraries, AI labels, customizable/collapsible details, OAuth consent, mobile layout and a simulated account service with isolated users and synced profiles. It also checks typo alternatives, library scope, lyric/review links and the ChatGPT evaluation import, including preview-only behavior, escaping, preserved notes and AI visibility modes. `test:browser` covers reviews, multiple libraries, plans and a simulated AI draft. It also exercises collection imports, CSV/library management, arrangements, plan copies, print/PDF output and completed-use history. These fixtures are not real provider integration tests. Chromium is expected at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another executable. `APP_URL` overrides the development test address.

The published static site has no private credentials or personal workspace data. Stored index words and notes belong to browser/account workspaces and their backups. Without a configured account, data stays in this browser. Clearing site data removes it; use **Backup & restore** for a copy. Restoring replaces the current workspace only after validation and confirmation; invalid files and cancellation preserve existing data. Backups are limited to 5 MB.

Live browser checks can use `APP_URL` for the published site,
`FAITHFUL_BROWSER_PROXY` for the configured network proxy, and
`FAITHFUL_BROWSER_CERT_DB` for already approved public certificate trust data.
The runner copies only that certificate database into a disposable profile and
keeps TLS verification enabled. It uses an isolated browser-only test workspace;
passing it does not establish actual Apple Passwords or real-account autosave.

Before deploying a paid AI backend for multiple users, add authenticated requests, authorization and rate limits. The current Node backend is for personal/local development. The app does not yet retrieve licensed lyrics, analyze scores/audio, verify every associated recording, or make shared church-use decisions automatically. Organization members organize those decisions in their own libraries.

The GitHub **App checks** workflow runs unit, scale and hosted browser checks on main pushes and pull requests, then verifies committed Pages output matches the build. Tests require no live AI credentials.

## Cloud tasks

Use the existing isolated checkout at `/workspace/Worship-Song-Tool`; no worktree is needed. Install with `npm ci`, run `npm test`, start with `npm start`, and validate `/api/status` plus the browser workflow. Manual reviewing/planning needs no credentials. Account integration requires the public project settings and deployed SQL; AI drafting separately requires a private server-side API credential.
