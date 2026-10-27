# Faithful Repertoire design and product constraints

Worship plans are built by people. Do not add song recommendations, suggested
service selections, automated setlists, or AI plan generation. Transcribing an existing human plan from a supplied
screenshot/PDF is allowed: preserve its order, never fill missing evidence, and
require review of uncertainty. Certain validated imports need no extra confirmation. The index is a
deterministic lookup of recorded song data, using filters selected by the user.
AI song assessment is optional per account and does not select worship songs.
Explicit plan/library evaluations may describe existing content against criteria
chosen by the user, including mixed coverage comparisons. Keep them read-only:
no candidate song recommendations, replacements, reordering or automatic edits.
The owner explicitly authorized three separate 0–10 scope judgments: Scripture
relevance when a passage is recorded, theological soundness with gospel coverage,
and logical lyrical flow for ordered plans. Keep reasons and reviewed evidence
with each score; unknown is unassessed, not zero. Do not create an overall/composite
worship score or change individual song ratings. Count libraries as distinct songs and plans as ordered occurrences;
separate unknown evidence from demonstrated gaps. Review copied scope/privacy and
AI prose; validating a JSON shape does not prove its claims. Reports are downloadable
snapshots and immutable Evaluation History entries, never plan/song edits or approvals.
Valid previews save reports only in editable workspaces; shared viewers remain
read-only. Coverage records presence separately from repeat-weighted lyrical
emphasis. Multiple themes, voices and functions may overlap in one section.
Never infer adequacy from a percentage or invent actual repetition patterns.
Unmarked sections count once with editable report-level repetitions. Musical
criteria and their data are opt-in; default reports focus on words.
Result relevance means repeat-weighted lyric emphasis followed by song coverage.
Offer most/least sorting, criterion filtering and an expandable full list. Sorting
never reorders a human plan. Numeric scope assessments are distinct from these
descriptive proportions and stay fixed when report-only repeat controls change.
An explicitly requested AI search may list tentative matches to a user-defined
subjective criterion within a selected personal library. It requires Full AI
content, evidence and uncertainty labels. It does not rank songs or edit plans.
The public app can prepare that explicit request for the owner's read-only ChatGPT
connection without sending an AI API request. Only the selected library name/ID
and human-entered criterion are copied; account data stays behind OAuth consent.
Do not imply that copying a request executes a search or imports its results.

Saved index views contain query/filter/display settings, never cached hidden AI
content. Recompute results with the current account preferences. Service templates
are owner-created snapshots stored separately from actual plans, so they never
count as planned or completed services. Instantiation resets dates/status and
creates independent item IDs; optional song placeholders are filled by a human.

Use a calm editorial interface suited to a working song reference:

- Warm light backgrounds, dark readable text, and a restrained forest/sage palette.
- Use solid forest/sage fills and white data surfaces; avoid green gradients.
- Georgia for editorial headings and system sans-serif/Arial for controls and reference tables.
- Spacing based on 4/8/16/24/32 pixels; align labels and data deliberately.
- Rounded panels (18–24px), controls (12px), and navigation (14px), with fine borders and subtle shadows.
- Keep the visual system in theme.css, separate from structural styles and plain print output.
- Use consistent, quiet line icons for navigation; no decorative icon tiles or animated gradients.
- Keep song results in a bounded, keyboard-accessible scroll area. Song details use normal page scrolling, with no independent scrollbar. Scrolling at the result boundaries continues onto the page. Selection preserves the result position and reveals the song heading.
- Group song content into Details & files, Outside links and Evaluation tabs. Keep the library action clear in the heading; place secondary actions in an accessible ellipsis menu. Preserve customized detail visibility and ordering within the tabs.
- With a mouse, navigation collapses to an icon rail and expands on hover or visible keyboard focus without moving page content. Touch navigation retains visible labels.
- Literal functional copy. Avoid marketing claims and AI magic/sparkle icons.
- Use tables for indexed data and clear lists for the human service order.
- Retain visible focus states, clear field labels, and mobile access to tables.
- Missing evidence stays blank or explicitly unassessed. Never invent keys,
  ranges, tempos, lyrics, or musical difficulty from a song title.

User-entered custom metrics extend the index without needing an AI provider.
Song words are optional; an opening-line search must not imply full-text coverage.

## Disclosure and provenance

Use one collapsible AI evaluation, a primary human evaluation and smaller secondary
AI content. Keep populated objective facts as plain text, with explicit uncertainty
and confirmation controls. Collections use expandable groups with lazy, paginated
song actions and bulk import. Keep dismissed records in the No Approval view under Libraries.
Use collapsible filters, library tools and simple
menus. Keep completed profile information and account-save explanations in menus.
Avoid decorative copy on library pages. Song attributes can be hidden/reordered per
song; user-created text/number attributes are indexed. Empty observations are omitted.

AI Labels default On, independently of how much AI content is visible. Mark generated
subjective fields, including unchanged AI content carried into a manual edit. Human
notes, arrangement measurements and deterministic text counts do not receive AI labels.
Prewritten ratings are model-knowledge drafts and must never be described as source
verification or human editorial review. Do not invent musical findings to fill a card.

Keep Scripture references to specific quotations or clear allusions with chapter and
verse. Broad topic overlap belongs in themes. Discuss soteriology only when an explicit
salvation claim is central to the song. Preserve the owner's personal concern for Kari
Jobe's Forever separately from AI assessments.

The ChatGPT MCP connection reads saved account records through explicit OAuth consent.
It exposes six read tools and no writes or automated service selection. Notes and song
text start unshared. Enforce owner isolation, visibility and consent inside PostgreSQL,
not only in tool descriptions. Revoke data access before attempting provider grant removal.

## Shared workspaces and readiness

Personal data remains private. Organizations are separate shared workspaces, not
shared passwords. Membership/roles, ownership and verified-email invitations are
checked inside PostgreSQL; OAuth connection tokens cannot read organizational
rows/files. Clients check changes every three seconds while visible. Conditional
revision writes and three-way merging preserve independent edits; conflicting
fields/order require review with a retained browser draft. View-only access is
blocked both in the interface and server. Transfer ownership atomically to an
existing member; never leave an ownerless organization. Native sign-in emails
use the configured provider, without privileged browser credentials.

Users organize song readiness through their own libraries. Offer starter library
names optionally, preserve prior decisions/notes as history, and never infer
library placement from a score. Evaluation/scoring stays optional and separate.
Use Plans, Plan templates, Plan items and Plan History consistently. Untimed
headings separate portions of an order. The song picker stays on Plans and offers
library/catalog browsing and unrated new-song drafts. It uses explicit multi-selection
and relative insertion, and skips placement for an
empty plan. Retain keyboard reorder controls alongside dragging. Album images
must come from matching recording metadata; blank artwork is better than guessing.
Hymnary links are finding aids unless a specific entry was verified.

## Search, imagery and authentication affordances

Keep active search fields mounted, preserve selection/IME, and refresh result
regions instead of the whole shell. Cache public lookup text and identity maps,
invalidate them when data or visibility changes, and continue to exclude
blacklists and hidden AI content. Collection depth controls remain editorial,
not empirical popularity. Popularity uses the current workspace's completed-plan
counts; chronology uses supplied recording-release dates with unknowns/reissues
visible. Never infer composition dates or chart positions from list order.
Discover defaults to the highest visible rating using active criteria; unassessed
records follow assessed scores, including zero. Human-only mode must not let hidden
AI scores affect ordering. Typed searches prioritize title relevance and use the
selected sort within relevance groups. Keep separate explicit sort choices for
Discover, libraries and No Approval. Result rows share a narrow single column at all
screen sizes; keep artwork, attribution, status and rating together, without empty
footer regions or clipped titles. Song selection and planning remain human choices.

Collection portraits use fixed public artist identities and sourced subject
images with attribution, lazy loading and honest unavailable-image fallbacks.
Do not send personal data/search terms to image providers or use album covers
as artist portraits. Save status must identify unacknowledged uploads and
unapplied form edits with labels/icons as well as color. Remember me controls
email/session retention without retaining passwords; native credential
suggestions and biometric prompts remain the browser's responsibility.


## Rebuilt navigation and lyrical evaluation

Keep four primary destinations: Discover, Evaluate, Libraries, Plans. Collections
is a Discover section; the Song index and Evaluation criteria remain within
Evaluate. No Approval is within Libraries and retains the stored blacklist schema.
Settings uses the top-right gear. Public #about explains purpose, workflow and the
developer without guest activation or workspace creation.
Song AI requests focus on usual words with explicit text/version override and
chosen-text assumptions. Do not stop supported lyrical findings for uncertain
artist metadata. Unsupported evidence remains unknown. Override changes clear
response/preview and rotate a request ID; copy/preview/apply also bind account,
song, mode, profile and original song snapshot. Only Traditional hymns receive
automatic title-bound Hymnary searches; Modern Hymns remain contemporary songs.
