# Faithful Repertoire design and product constraints

Worship plans are built by people. Do not add song recommendations, suggested
service selections, automated setlists, or AI plan generation. Transcribing an existing human plan from a supplied
screenshot/PDF is allowed: preserve its order, never fill missing evidence, and
require review of uncertainty. Certain validated imports need no extra confirmation. The index is a
deterministic lookup of recorded song data, using filters selected by the user.
AI song assessment is optional per account and does not select worship songs.
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
song actions and bulk import. Keep dismissed records in the personal Blacklist.
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
headings separate portions of an order. The plan library picker stays on Plans,
uses explicit multi-selection and relative insertion, and skips placement for an
empty plan. Retain keyboard reorder controls alongside dragging. Album images
must come from matching recording metadata; blank artwork is better than guessing.
Hymnary links are finding aids unless a specific entry was verified.
