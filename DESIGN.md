# Faithful Repertoire design and product constraints

Worship plans are built by people. Do not add song recommendations, suggested
service selections, automated setlists, or AI plan generation. The index is a
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
- Soft background gradients and a deep green navigation rail establish hierarchy; keep data surfaces white.
- Georgia for editorial headings and system sans-serif/Arial for controls and reference tables.
- Spacing based on 4/8/16/24/32 pixels; align labels and data deliberately.
- Rounded panels (18–24px), controls (12px), and navigation (14px), with fine borders and subtle shadows.
- Keep the visual system in theme.css, separate from structural styles and plain print output.
- Use consistent, quiet line icons for navigation; no decorative icon tiles or animated gradients.
- On phones, keep song results in a bounded, keyboard-accessible scroll area so the selected record is easy to reach.
- Literal functional copy. Avoid marketing claims and AI magic/sparkle icons.
- Use tables for indexed data and clear lists for the human service order.
- Retain visible focus states, clear field labels, and mobile access to tables.
- Missing evidence stays blank or explicitly unassessed. Never invent keys,
  ranges, tempos, lyrics, or musical difficulty from a song title.

User-entered custom metrics extend the index without needing an AI provider.
Song words are optional; an opening-line search must not imply full-text coverage.

## Disclosure and provenance

Use collapsible song attributes, rating breakdowns, filters, library tools and simple
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
