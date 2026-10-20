# Faithful Repertoire request ledger

Keep this file current when continuing work. Read README.md, DESIGN.md and this
ledger at the start of a task. Resume unfinished requests after interruptions;
do not treat a new prompt as cancellation unless the owner says so. Mark an item
complete only with implementation and meaningful verification. Record external
blockers explicitly. Preserve personal assessments, recordings and workspaces.

## Landing page and visible About navigation (October 19, 2026)

- [x] Add an editorial landing page at #home, opened by the menu logo and header
  wordmark, with prominent About access and four tool entry points. Keep the
  existing root sign-in/Discover entry and four primary menu destinations.
- [x] Replace the 9px inherited footer link with explicit 14px text and a 44px
  target. Add Home navigation to the sign-in wordmark and public Home/About
  header. Public pages never activate or create a browser workspace.
- [x] Check 320/390/768/1024/1440px layouts, all tool links, Home reload, menu and
  header navigation, criteria discard/cancel guards (including URL changes),
  view-only shared-workspace context and preservation of notes, libraries,
  plans and evaluations. All 149 unit/database tests passed; targeted landing
  browser checks and the full hosted regression suite passed.
- [x] Publish frontend `43527cc`. Cloudflare Pages, the Cloudflare Worker build
  and GitHub Pages reported success. A live check on the reachable GitHub site
  confirms public Home/About, explicit guest entry, mobile logo navigation and
  the readable footer About control. The Cloudflare hostname remains blocked
  by this execution environment; its provider deployment result is verified.
  Starting source/check count: 36,351; final: 36,542.

## Version history and visual audit (October 19, 2026)

- [x] Add automatic device checkpoints in IndexedDB, named versions, dated lists,
  change previews, JSON downloads and guarded restores. Preserve a recovery copy
  before replacing data, including file-backup and account-copy loads.
- [x] Add private database history triggers/RPCs with native owner/member access,
  current organization roles, OAuth denial, bounded retention and atomic
  timestamp/revision checks. Device and account histories remain separate from
  the workspace itself. Keep current AI visibility during history restores.
- [x] Audit Discover, Collections, Evaluate, Song index, Criteria, Libraries,
  No Approval, Plans, Settings, About, account and review flows at phone/tablet/
  desktop widths. Fix label/control margins and heights, cramped shared selectors,
  clipped phone tabs, sticky criteria actions, the detached New lens bar and a
  stale unsaved-form warning after criteria saves. Include long lens names and
  populated/shared workspaces.
- [x] All 149 unit/database tests, 1,000-song/1,000-plan scale check and MCP type
  check pass. Real IndexedDB browser checks cover isolation, immutable capture,
  throttle, concurrent retention, storage failure, previews, downloads, cancel,
  restore, recovery, reload and stale-tab rejection. Real PostgreSQL browser
  fixtures cover personal and shared cloud restores and view-only restrictions.
  The full hosted regression suite passed. A fixture
  now waits for the asynchronous profile download before asserting its value.
- [x] Published frontend `6e0db78`; Cloudflare Pages, the Cloudflare Worker build
  and GitHub Pages all reported success. GitHub's first browser run reloaded
  immediately after clicking restore, before the new asynchronous recovery copy
  completed. The fixture now waits for the dialog to close. Follow-up UI shows
  restoring progress, prevents concurrent restores and guards reload/Escape while
  recovery is pending; a controlled-delay browser test verifies these states.
- [x] Installed and verified account-history production migration through the
  existing encrypted GitHub Supabase deployment credential. The local management
  credential still returns HTTP 401, but the separate GitHub credential works.
  `Deploy workspace history` passed all tests, applied the migration and verified
  the table, four RPCs and two triggers on commit `e655ebd`. The production REST
  probe now returns permission denied for anonymous history access (42501),
  confirming that the RPC exists and is protected. No manual SQL is required.
  The corrected frontend `095a6a9` passed all GitHub App checks; Cloudflare Pages,
  Worker builds and GitHub Pages published successfully. Production browser
  checks on the reachable GitHub fallback save/preview device history on mobile.
  This environment still cannot directly open the Cloudflare hostname. No
  private production account contents were used in tests.
  Starting source/check count: 35,548; final: 36,351.

## Cloudflare hosting setup

- [x] Owner created a Cloudflare account and connected GitHub. Inspect the
  existing build and current Cloudflare Git integration documentation.
- [x] Prepare `.node-version` for Node 24 and exact Pages settings in
  `CLOUDFLARE-SETUP.md`: repository root, `main`, no framework,
  `npm run build:site`, output `docs`; existing public Supabase configuration.
- [x] Document the separate browser-data migration and coordinated auth/OAuth
  domain switch. Preserve GitHub hosting, Supabase data and current connector.
- [x] Build succeeds. Root-hosted browser checks pass for public About,
  flashcards and consent with locally emulated Cloudflare extensionless redirects
  and query preservation. This does not verify an actual Cloudflare deployment.
  Push the setup guide and Node version pin for the Git-connected build.
  Starting/final source/check count: 35,548 (no application source changes).
- [x] Owner supplied `https://faithful-repertoire.pages.dev/`. Cloudflare's
  GitHub check reports a successful deployment of `6075c76`, deployment ID
  `255770a8-516a-4044-bda9-648c31413ccd`. App checks and GitHub Pages also passed
  that commit. Record the Cloudflare URL while preserving the original site.
- [x] Owner confirmed that the Cloudflare site opens normally and existing
  account sign-in works. Use Cloudflare as the frontend link; keep GitHub for
  existing browser copies and the current ChatGPT consent flow.
  Automated live browser checks remain blocked by this workspace's hostname
  allowlist (CONNECT 403); the web-reading tool also could not open the URL.
  Do not describe this network restriction as a website error or claim that
  live asset hashes/every browser flow were independently verified.
- [x] Owner confirmed adding `https://faithful-repertoire.pages.dev/` to
  Supabase's redirect list on October 19, 2026. Initial Cloudflare hosting and
  sign-in setup is complete, with the existing Site URL/ChatGPT consent flow
  retained. The owner made the dashboard change after the configured management
  credential was rejected (HTTP 401); no auth writes were performed by Codex.
  Email confirmation/reset delivery has not been independently tested.
  Browser-only copies remain on their original origin until explicitly exported
  and restored. Source/check count remains 35,548.


## Flashcards and final decisions on the 150-song shortlist

- [x] Build a one-card-at-a-time review with Keep, Remove, Decide later,
  notes, undo, keyboard controls, search/filter, rating flags, listening/lyric
  links and expandable source-bound evaluations. Public catalog data only.
- [x] Preserve browser progress, export CSV/JSON and copied-number summaries,
  and merge validated decision backups without replacing newer notes/choices.
  Keep new review choices separate from catalog changes and personal workspaces.
- [x] Owner subsequently decided: keep All of a Sudden and Lord of the Dance;
  retain every original shortlist song strictly above 8.5 for further review;
  retire the rest. This retains 9 (7 pending review), retires 141 and leaves
  835 evaluated defaults. Record exact IDs/scores in `decisions-150.json`.
- [x] Focus flashcards on the seven pending songs, with the original choices
  prefilled. Retain all 150 identities/original ratings for historical review.
- [x] Verify: all 143 unit/database checks pass, including exact owner choices,
  strict threshold, source coverage, backup merge/validation, CSV and all 165
  recent retirements preserving saved human reviews, custom scores, recording
  removals, libraries and plans. All 69 starters, 42 artist groups and 58
  collections remain.
- [x] Focused review browser checks pass for notes, shortcuts, undo without
  losing other notes, reload, ratings/evaluations, AI hiding, retired metadata,
  validated imports/downloads, unavailable storage and unreadable-copy preservation.
  Desktop/mobile visuals checked; no horizontal overflow at 320/390/900/1440.
- [x] Full local hosted suite passes on retry. The first run hit the previously
  observed concurrent-token-refresh timing assertion (2 rotations instead of 1);
  account code was unchanged. The second run passed all account/shared-workspace,
  planning, library, catalog and new flashcard flows.
- [x] Publish release `8edd050`. [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39316088366)
  and [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39316084335)
  passed, including the full hosted suite, MCP type checking and scale.
  Nine live assets matched the release. Live catalog checks confirmed 835
  expanded defaults, 69 starters, 42 artist groups and all 165 recent retirements
  absent from discovery/collections. Live reload preserved all 165 saved copies,
  human reviews, removed recording links, library membership and a service plan.
  Direct live flashcard checks passed for all review, rating/evaluation, note,
  undo/reload, backup, storage-failure, AI-hiding and four-width layout flows.
  Disposable browser fixtures only; no real-account reads/writes.
  Starting source/check count: 35,203; final source/check count: 35,548.

## Retire 24 unresolved defaults and review the next 150

- [x] Owner explicitly approved discarding all 24 unresolved song identities.
  Remove only preloaded defaults and their analysis manifest entries. Retain
  saved workspace songs, evaluations, notes, recordings, libraries and plans.
- [x] Retain all 69 starter songs and all 42 artist groups. Remaining catalog:
  976 defaults, all 976 with expanded lyric evaluations. Catalog revision 16.
- [x] Prepare `data/catalog-selection/review-150.md` and CSV: 150 editorial
  trimming candidates, grouped by artist with stable numbers and exact IDs.
  The owner clarified least familiar/useful, not lowest evaluation scores.
  Flag default weighted AI scores of 8.0 or higher (45 records).
- [x] Preserve all 150 pending the owner’s decision. The owner subsequently kept 9 and approved retiring 141; see the current request above.
- [x] Verify locally: 139 unit/database checks and focused catalog/lens browser
  checks pass, including all 24 saved copies, review/recording preservation,
  libraries/plans, 69 starters, 42 artist groups and 58 collections.
- [x] Publish release `71077c4`. [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39276042461)
  and [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39276041533)
  passed, including MCP type checking, scale and the complete hosted browser suite.
  All three changed live assets matched the release. Direct live checks confirmed
  976 expanded defaults, all 24 absent from discovery/collections, and all 24 saved
  copies preserved through reload with human reviews, removed recording links,
  library membership and a service plan. Disposable browser data only.
  Starting source/check count: 35,182; final source/check count: 35,203.

## More visible About and a visual Collections grid

- [x] Make About more noticeable without overwhelming the workspace; include
  the signed-out entry and a persistent, readable header link.
- [x] Mix artists, eras, styles and themes in a responsive collection card grid.
  Default to an editorial relevance order, with query matches first and A–Z
  available. Keep collection IDs and saved imports stable.
- [x] Give non-artist collections distinctive names with descriptive subtitles;
  add recording-art mosaics, attributed portraits and illustrated fallbacks.
- [x] Verify search, filters, depths, imports, keyboard navigation, mobile layouts
  and unavailable images. 138 unit/database checks passed. The full hosted
  browser suite passed on retry after the existing concurrent-refresh timing
  assertion failed once. Focused grid/About checks passed at four viewport sizes.
- The owner explicitly authorized publishing after seeing the pending question.
  Automatic approval review had previously blocked the direct push; that block
  was respected until this authorization arrived.

## Finish the remaining 592 evaluations

- [x] Complete the owner's requested whole-catalog pass. Start: 408 expanded of
  1,000; 592 remaining. Source/check starting count: 34,445.
- [x] Research the lyric texts for 568 additional catalog records. Write
  separate reasons, themes, checked KJV comparisons and exact short concerns.
  Current coverage: 976 expanded; 24 identities unresolved. No unmatched or partial texts remain.
- [x] Preserve private reviews, notes, recordings, approvals and lens evaluations;
  source refresh remains limited to untouched public defaults.
- [x] Publish the first 110-record checkpoint `6dcd84c`: App checks
  `39195915766` and Pages `39195914870` succeeded; 137 local tests and focused
  lens/catalog browser flows passed.
- [x] Check the local 310-record checkpoint and the new collection grid/About UI.
  The full hosted suite passed. Release `5c19428` passed App checks `39261609029` and Pages `39261608789`; all seven changed live assets matched the commit, and live catalog/lens checks passed.
- [x] Retire the final 24 ambiguous identities after the owner explicitly approved discarding all of them. Saved workspace copies remain intact.

The 910-report release `d81f103` passed App checks `39264926791` and Pages `39264927162`, plus direct live catalog checks. The new working checkpoint adds 66 more reports, reaching 976. The whole pass added 568 evaluations, with three distinct reasons, themes, checked KJV quotations and brief exact concerns. All previously brief drafts now have expanded reports. The final 24 records need exact identities rather than additional generic lyric searching: several results are album titles, fragments of already represented songs, or different artist associations. These records have individual on-page explanations and a candidate-reference audit. No personal record or public default has been removed while the retirement choice is pending.

The owner declined further Sites research; retain the current hosting setup. Release `5985085` published the 976-report checkpoint. [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39267291847) and [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39267291324) succeeded. All 138 local unit/database checks passed; CI also passed MCP type checking, scale and the full hosted browser suite. Eight live assets matched the committed release. Direct live checks passed for report reasons, KJV quotations, source links, four layouts, human-only hiding and saved human judgments/libraries/plans. The live mixed collection grid, prominent signed-in/signed-out About, and individual unscored identity explanations passed at four widths. Disposable browser data was used without real-account writes. Source/check total: 35,182.

Two temporary live-check fixtures initially used an invalid empty-library workspace; that test setup was corrected to include a required synthetic library. No website fix was needed. At that checkpoint, the final 24 identity questions were pending the owner's retirement preference and the catalog contained 1,000 records. The owner subsequently approved retiring all 24; see the current request above.

## Manageable catalog, analysis lenses and workflow guidance

- [x] Reduce preloaded discovery/index catalog to 1,000 useful, familiar
  records; favor core repertoire and trim deep cuts and duplicate recordings.
  Preserve every existing workspace song, evaluation, library and plan.
- [x] Add 31 source-supported analyses (408 expanded in the reduced catalog). Use direct prose; remove
  repeated generic AI caveats while retaining concrete source/identity limits.
- [x] Add selectable independent analysis lenses with criteria, weights, song
  evaluations, purpose, backup/account/shared-workspace preservation and request binding.
- [x] Add About recommended workflows: occasions/groups/readiness libraries,
  service preparation, seasonal/yearly plan reviews and library analysis by lens.
- [x] Verify migration and lens isolation: 137 unit/database tests pass; MCP type
  checking and 1,000-song/1,000-plan scale check pass (67 ms). The complete local
  hosted suite passes, including lens creation, independent reviews/weights,
  shared personal notes, reload, dirty-form guard, four viewport sizes, public
  About, private/shared account workflows, backups and plan preservation.
- [x] Publish release `0e0337b`: App checks `39193303667` and Pages
  `39193303353` succeeded. All 12 changed live assets matched the checked
  release. Live lens creation, independent ratings/weights, shared notes and
  existing plan preservation, reload, dirty-form guard, four layouts, About
  workflows and source-supported report checks passed.
  Final source/check count: 34,445.

Current whole-catalog scope: 835 preloaded records, all with expanded reports.
The 24 unresolved defaults were retired with owner approval; historical issues remain in `data/catalog-analysis/identity-issues.json`. The prior 2,044-song
ledger below is historical coverage, superseded by the owner's reduction request.
All saved personal records are preserved, including retired default versions.

## Distinct page tabs and deeper catalog evaluations

- [x] Restyle page-section navigation as connected tabs, with a shared baseline,
  selected panel edge, top accent, keyboard focus and a bounded mobile strip.
  Published incremental UI release `244cc50`; the 32-state rebuild fixture passed.
- [x] Audit all 2,044 song/version records against available public text sources;
  keep a per-record coverage manifest rather than silently treating gaps as complete.
- [x] Write 501 expanded preliminary lyric analyses with separate reasons for
  doctrinal accuracy, theological substance and language; evidence-backed themes,
  brief exact excerpts where wording is questioned, and checked KJV comparisons.
  These cover song/version records, including several recordings of the same text.
  234 explicitly identify an assumed usual text; the recording remains unverified.
- [x] Add 241 newly scored text drafts (520 rated catalog records total), with
  arrangement scores unknown; retain 19 earlier brief drafts still awaiting deeper
  source support. Do not claim all rated records received a lyric review.
- [x] Keep human assessments/convictions, imported AI text versions, custom scores,
  notes, explicit recording removals, human decisions, libraries and plans intact.
  Refresh default drafts only for unchanged identities. A catalog research update
  no longer resets a saved human church-use decision. AI-only content respects
  Full/limited/human-only preferences, dismissal and hidden attributes.
- [x] Keep the two different Nothing but the Blood texts separate. Flag apparent
  transcription error and incomplete medley source instead of scoring either as
  if a reliable complete text had been read.
- [ ] Complete deeper analysis for **every** song. Precisely **1,543** remain:
  1,362 without a source match in the audited collections, 181 with title-only
  identity candidates. The two earlier incomplete/suspect sources are now resolved. Missing evidence remains
  unknown; these findings do not establish that texts are unavailable everywhere.
  Finishing requires identifying/retrieving the remaining texts, resolving versions
  and carrying out the same lyric-based review. Reliable supplied/licensed texts
  can close source gaps; no private workspace words were sent to lookup services.
- [x] Publish and verify first catalog release `9bb0ec8`: 128 unit/database tests,
  scale (70 ms), MCP type checking and the complete hosted browser suite passed.
  GitHub App checks `39045630271` and Pages `39045629869` succeeded. All six live
  changed assets matched the checked files; live analysis/mobile/human-primacy and
  request-regression flows passed.
- [x] Continue public lyric searches after the owner clarified their source:
  public search results and accessible artist/publisher pages. No shared SongSelect
  login was used. The follow-up now covers all 69 starter songs; Known by You
  explicitly flags a Gateway/Elevation RHYTHM attribution mismatch.
- [x] Verify the follow-up source batch locally: 129 unit/database tests and the
  focused browser fixture passed. All 69 starter records have expanded drafts.
- [x] Publish starter-source follow-up `cf9d70d`; Pages `39046208312` succeeded.
  Its App checks run `39046208375` passed unit, MCP and scale but failed the hosted
  browser step. Signed log-storage hosts are unavailable under this environment's
  network policy; the retry succeeded. The current-data local full suite passed.
  Hosted-smoke failures now also emit a Checks API annotation for diagnosis.
- [x] Add CityAlight, Sovereign Grace and modern-hymn source groups, with distinct
  CityAlight/Sadler Ancient of Days analyses and explicit source/stanza selections.
  Increment catalog revision so untouched defaults refresh after later batches.
- [x] Current-data local verification: 129 unit/database tests and the complete
  hosted browser suite passed; source/check count is 35,098.
- [x] Release `c09bbf1` passed App checks `39046941994` and Pages `39046941733`.
- [x] Resume October 18 public research: add 14 records from 12 identified texts,
  with specific wording concerns for Yet, Death Was Arrested and In Jesus’ Name.
  Preserve all prior source dates/hashes across research batches; an empty-batch
  comparison retained every committed report exactly. Two retention tests cover
  cache loss and rejection of mismatched identities/provenance. All 131 tests pass.
- [x] Publish October 18 checkpoint `9615381` (470 expanded entries): App checks
  `39169548366` and Pages `39169548094` succeeded. The three changed live catalog
  files exactly matched the checked release. Live analysis/source/mobile/human
  judgment checks passed in a disposable browser context.
- [x] Resolve both previously held source texts with fuller music-resource lyrics.
  The correct Unstoppable God victory wording is also present in Elevation's
  official lyric-video description. Add the complete medley and specific reasons,
  themes, Scripture comparisons and appropriately contextualized wording concerns.
  Keep the Gaither Something Beautiful text separate from an unverified Chapman
  association; keep the Craig/Koch In Christ Alone distinct from Getty/Townend.
- [x] Verify 479-entry follow-up locally: all 132 unit/database tests and focused
  browser checks passed, including resolved-source display and preservation of
  existing human judgments, libraries and plans.
- [x] Release `c584afe` passed App checks `39170233001` and Pages `39170232102`.
- [x] Add the gospel/hymn follow-up: Precious Lord, My Tribute, Total Praise,
  Goodson’s selected hymn text, separate Watts/Hudson texts, and a fuller Hoffman
  transcription. The Goodson report identifies its public search-index access and
  verse variant rather than silently using a garbled alternative.
- [x] Correct one expanded report that lacked numerical draft scores; its selected
  Sadler/Harvill text now has explicit text scores and the artist association
  remains unverified. Require all completed reports to have three finite criterion
  scores and verify the same invariant across every generated report.
- [x] Verify the 486-entry follow-up locally: 132 unit/database tests and focused
  desktop/mobile browser checks passed. Source/check count: 35,223.
- [x] Release `c3b415c` passed App checks `39170954587` and Pages `39170954082`.
- [x] Add ten expanded song/version drafts from eight Hillsong, Bethel and hymn
  texts. Expand KJV comparisons to whole checked verses so qualifications and
  Trinitarian wording remain visible. Increment catalog revision to refresh defaults.
- [x] Verify the 496-entry follow-up locally: all 133 unit/database tests and
  focused browser checks passed at four screen sizes, including whole-verse
  Scripture display and preservation of human judgments, libraries and plans.
- [x] Pages release `45dd287` succeeded (`39171578197`). Live catalog assets
  matched the release, and live mobile/report/personal-preservation checks passed;
  App checks `39171578552` succeeded.
- [x] Read four more official texts and add five song/version reports, bringing
  coverage to 501. Explain figurative love language in Good Grace and distinguish
  presence through suffering from promised escape in Another in the Fire.
- [x] Verify the 501-entry follow-up locally: all 133 unit/database tests and
  focused browser checks passed at four sizes. Source/check count: 35,246.
- [x] Publish `7cd634b`: Pages `39171741379` succeeded. Live catalog assets
  exactly matched the release, and live report/mobile/personal-preservation checks
  passed.
- [x] App checks `39171742194` passed on retry, and the complete local hosted
  suite passed. The first hosted attempt failed the existing concurrent-tab
  account assertion (two refresh calls instead of one); this was not reproduced
  locally or on retry. No account code was changed and the intermittent failure
  is not claimed fixed. All 133 tests, MCP, scale and hosted checks now pass.
- [ ] Continue the whole-catalog public-source review; no lyric-account access
  is required for the current public-source queue.

## October 17 rebuild from the working remote save

Starting point: clean `39904b9`; GitHub default `main` was inspected and fetched
before editing. No reset, worktree, old-workspace recovery or Supabase replacement
was performed. The failed environment for support case #17256660 remains intact.
Historical release checks below are retained as history, not evidence for this rebuild.

Status key: **implemented** means present in the audited code; verification for
this rebuild is recorded separately below. **External** means a real provider,
account/device or platform capability remains necessary.

| Request | Implementation / remaining work |
| --- | --- |
| 1 | Implemented: Discover → Evaluate → Libraries → Plans, four primary entries. |
| 2 | Implemented: Songs/Collections under Discover; Song index retained under Evaluate. |
| 3 | Implemented: Evaluate song workspace; selected song/query retained across criteria visits. |
| 4 | Implemented: Evaluation criteria in Evaluate/Settings; top-right gear; essential account menu. |
| 5 | Implemented: No Approval under Libraries; original `blacklisted` flags retained; exclusion/restoration paths preserved; historical insertion/export title leaks corrected. |
| 6 | Implemented: Plan History terminology retained; user-facing criteria/exclusion labels updated. |
| 7 | Implemented: public `#about`, purpose and connected workflow; no guest opt-in or workspace creation on public visit. |
| 8 | Implemented: William Booth biography and contact with all supplied facts and intentions. |
| 9 | Implemented: word-focused request, usual recognized text/assumptions, partial evidence and artist uncertainty rules. |
| 10 | Implemented: explicit text/version override clears response/preview and rotates request ID; account/song/profile/snapshot guards at copy/preview/apply. |
| 11 | Implemented: Modern Hymns explanation/category compatibility; only Traditional hymns get automatic Hymnary searches. |
| 12 | Preserved: 0–10 anchors, blank unknowns, criterion rubrics and arrangement coherence. |
| 13 | Preserved: criterion controls/weights/saved scores; added optional intelligibility/shared-expression rubrics with overlap cautions. Existing profiles are not changed. |
| 14 | Preserved: three AI modes, copy/preview/apply, human primacy, notes/recordings and focused scrolling preview. |
| 15 | Preserved: explicit read-only Library Audit, reviewed prompt, charts, limitations and report snapshots. |
| 16 | Preserved: direction, Trinity, voice, lament/celebration/function, evidence coverage and no universal ideal. |
| 17 | Preserved: existing-plan and mixed-scope evaluation, selected criteria/purpose, no song selection/edits. |
| 18 | Preserved: distinct library unions, ordered plan occurrences/non-song items, privacy/staleness/download guards. |
| 19 | Preserved: mounted collection search input, caret/selection/IME and coalesced result updates. |
| 20 | Preserved: song-title collection search; per-collection depth/search/sort; actual completed-use/release evidence. |
| 21 | Implemented: fixed-identity attributed portraits/fallbacks. External: live Wikimedia coverage/delivery not verified. |
| 22 | Preserved: visible active-criterion ratings, unassessed last, human overrides/zero and independent sorts. |
| 23 | Preserved: compact result rows, wrapping and direct page jumps. |
| 24 | Preserved: selected details revealed, result position retained, normal detail/page scrolling. |
| 25 | Preserved: library primary action, ellipsis, attribution editing, accessible three-tab detail and custom attributes. |
| 26 | Implemented: exact recording artwork; traditional-only title-bound Hymnary search. External: live artwork CDN access. |
| 27 | Preserved: Personal/multiple organizations, roles, invitations, transfer/removal and server enforcement. |
| 28 | Preserved: automatic shared refresh/revisions/merge/private drafts and personal AI preferences. External: actual email delivery and real-account concurrent/offline sessions. |
| 29 | Preserved: explicit screenshot/PDF sharing and stale-safe transcription import, uncertainty review and supplied order. |
| 30 | Preserved: untimed headings, corrected continuous timed numbering in display/export/insertion, drag and keyboard ordering. |
| 31 | Preserved: in-place multi-library/page selection, explicit insertion and empty-plan simplification; search alone is not marked dirty. |
| 32 | Preserved: plan accents/keys, duplication/export/print/history and independent dated template copies. |
| 33 | Preserved: optional user-owned starter libraries and explicit historic-decision migration. |
| 34 | Preserved: sign-in gate and explicit separate browser-only access. Public About does not activate it. |
| 35 | Preserved: native autofill/DOM submission, remembered email/session, no password storage. External: physical browser/device biometric prompts. |
| 36 | Preserved: bounded startup, expired-session recovery, saved-copy/retry paths and honest sync status. |
| 37 | Preserved: browser commits, serialized autosave, colored/text statuses and form/picker dirty state. External: real-account offline verification. |
| 38 | Preserved: native leave warning; criteria navigation now offers discard/cancel without replacing the form on cancel. |
| 39 | Preserved: compact grouped Settings and collapsed advanced tools. |
| 40 | Implemented: smaller mobile panels/headings/lists/dialogs and four-item navigation; four-width browser/layout review in progress. |
| 41 | Unapproved proposals remain separate below; none implemented. |
| 42 | Verified this task: Apple HTTP 200; Songlink reachable but HTTP 401 `PUBLIC_API_ACCESS_DEPRECATED` (one check only). Existing metadata not replaced. |
| 43 | Preserved: evidence-backed direct links and honest searches. External: supported Spotify/YouTube mapping source remains unavailable. |
| 44 | Preserved: personal recordings/order/removals/empty lists/identity overrides and catalog-only lookup inputs. |
| 45 | External: enforced policy lacks four image hosts; no configuration draft/edit tool is callable in this chat. No stale draft retried or settings removed. |
| 46 | Implemented: pinned code count/build report retained; final actual total recorded after build. Native Codex UI is outside repository control. |
| 47 | Preserved: use incremental Git commits/pushes; no claim that a ZIP fixes platform artifact downloads. |

Rebuild local verification complete: all **121 unit/database tests**, MCP type
checking, scale checks and the full hosted browser suite passed. The targeted
final-build fixture also passed after the last mobile CSS refinement, including
criteria discard/cancel retention, pasted-response save status, public About,
override request binding, excluded insertion/export isolation, continuous timed
numbering and picker search/selection dirty state. Eight views were checked at
320/390/900/1440px (32 layout states); desktop/tablet/mobile screenshots and
representative inherited dialogs were visually inspected. The final local count
is **32,410 source/check lines**, excluding generated docs copies.

Both initial milestones (`7188038`, `8be6b54`) were pushed to the progress branch.
Release `85265bd` was pushed to `main` after fetching and confirming no newer
remote changes. [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39040435613)
succeeded. Eleven deployed frontend files exactly match the checked build.
The new rebuild fixture passed live in Chromium with TLS verification enabled:
public About without guest/storage activation; navigation/criteria context;
criteria discard/cancel; override/request guards; exclusion-safe plan insertion
and export; continuous numbering; picker search/selection status; and all four
viewport sizes. The retained request regression also passed live. These used
disposable browser-only storage and intercepted image-provider requests, with no
real account writes or email messages.
[Release CI](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/39040435961)
succeeded: all 121 unit/database tests, MCP type checking, scale checks, the
full hosted browser suite and generated-file/code-count consistency passed.
This publication record is a documentation-only follow-up; frontend release
`85265bd` is deployed and verified.
Browser image/provider fixtures do not prove real image or email delivery,
physical Safari/biometrics or actual account autosave recovery. These external
checks remain outstanding; no real account records or email deliveries were
modified by the tests.

### Unapproved proposals (not part of this rebuild)

- Persistent unfinished-form/report drafts.
- Organization history/Undo.
- Searchable plan archive/calendar.
- Saved evaluation-report history.
- Separate mobile song drill-down.

## Compact search results, top-rated discovery and code total

- [x] Tighten awkward result spacing and empty areas; use a narrower, consistent
  single-column list with compact rows, natural long-title wrapping and clear ratings.
- [x] Default Discover to the highest visible ratings using the active criteria;
  keep unknowns last, preserve personal evaluations and AI visibility, and keep
  typed title matches ahead of broader artist/theme matches. Preserve each page's
  explicit sort choice separately.
- [x] Add a reproducible running code count, a refreshed CODE-STATS.md file and
  progress/final totals; site builds refresh it automatically without double-counting
  the generated website in the main total.
- [x] Publish and verify the changes and preserve earlier requests/data.
- [ ] Display the count persistently in Codex's native top-right corner. Blocked:
  this chat's tools expose no native UI customization or counter-setting capability.
  Repository code cannot change that interface. CODE-STATS.md, `npm run code:count`
  and progress/final totals provide the available persistent count/reporting path.

Counts include physical lines (comments and blanks) in source/support code and
checks; generated docs copies are reported separately. Markdown, JSON/configuration
data, images and dependencies are excluded. The initial count was 32,016 unique
source/check lines (56,344 including generated website code). An older chat's
29,000 figure cannot be compared without its counting definition or snapshot.
Implemented compact artwork/title/rating rows, a 280–380px desktop results column
and one results column at every screen size. Natural title/attribution wrapping,
AI provenance, keyboard selection, normal detail/page scrolling and result-boundary
scroll chaining are preserved. Initial details open the highest visible rating;
explicit sort choices stay separate for Discover, libraries and Blacklist. Numeric
values are calculated once per sort to avoid rebuilding reviews during comparisons.

Local verification passed 118 unit/database tests, the catalog checks, scale checks
and the new discovery/browser cases (visible ratings, active criteria, human
overrides, zero vs. unknown, hidden AI, blacklist, exact-title relevance, independent
sorts, narrow wide-screen rows, long-title wrapping and keyboard access). Earlier
hosted scenarios passed through account/organization recovery, planning, audits,
files, collections, scrolling and imports. Final recording-choice/removal/reload
and request regressions were rechecked after updating fixtures to select their
intended song explicitly instead of assuming the first catalog song opens.
Desktop, wide-screen, tablet and mobile screenshots were inspected.

`npm run code:count` currently reports **32,173 source/check lines**, excluding
the generated website copy. Consecutive runs reproduce the same report; builds
refresh it, and CI checks its consistency. Future-task reporting is recorded in
AGENTS.md. The native Codex corner remains outside this chat's available controls.
Release `850581f` is live: [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38495986288)
and [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38495985633)
succeeded. CI passed all 118 unit/database tests, MCP type checking, scale checks,
the full hosted browser suite and generated-site/code-count consistency. Five
public frontend files match the tested build. The new discovery/default-sort
workflow also passed on the live site using disposable profiles, verified TLS,
synthetic local workspaces and intercepted image requests; no production account
records were written. Earlier provider/account/image-verification blockers and
the unavailable native Codex corner customization remain explicitly tracked.

## Plan evaluation, mixed scopes and visual separation

- [x] Add a read-only Plan Evaluation with criteria selected by the user, custom
  questions, strengths/gaps/unknowns and a downloadable report; preserve human-led
  worship planning and all personal choices.
- [x] Include multiple plans, libraries or a mixture in one request/report, with
  coverage comparisons against existing content, deduplicated library unions and
  plan occurrences. Do not recommend songs, assemble a plan or edit saved data.
- [x] Add restrained color to distinguish plan headers, headings, song rows and
  keys, plus quiet color for index controls and opened collection headers, with
  mobile/keyboard access and plain print output intact.
- [x] Complete regression checks and publish/verify the released build.

Implemented **Evaluate plan** in Plans and additional scope/criteria choices in
Library Audit. Reports describe each chosen scope and mixed aggregate coverage,
with charts for each scope, distinct library unions and repeated plan occurrences.
Selected/custom criteria and a stated purpose replace an assumed ideal or overall
worship score. Expandable chart/criterion sections and focused report headings
keep long reports navigable on desktop/mobile. Downloads include the selected
snapshot; reports never modify saved work.

Verification: 118 unit/database tests, the full hosted regression suite and scale
checks passed locally. Focused final browser checks additionally passed mixed
scopes, privacy/blacklist exclusions, selected/custom criteria, union/occurrence
counts, safe text display, wrong-request/unsupported-field rejection, changed
evidence/mode/workspace guards, unchanged saved data, download and visible report
headings on mobile. Real-SQL organization browser fixtures verify a Full-AI
view-only member can prepare a report without advancing the shared revision or
exposing private Personal notes. Screenshots were inspected. The report responses
are synthetic fixtures: AI observations/source validity still require human
verification. JSON validation rejects recommendation/score/edit fields but cannot
prove the meaning or truth of free prose.

Release `faa8ef4` is live. [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38492084940)
and [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38492084565)
succeeded. CI passed all 118 tests, MCP type checking, scale checks, the full hosted
browser suite and generated-file consistency. Seven live frontend files match
the tested build, including both new evaluation modules. The new evaluation and
organization workflows passed on the published site with TLS verification enabled,
disposable browser profiles and synthetic intercepted provider requests. Only
the approved public certificate trust database was copied; no saved sessions,
passwords or personal workspaces were copied. No production records or emails
were written. Desktop/mobile report and plan-color screenshots were inspected.

Earlier unresolved provider/network/account verification tasks remain below; this
feature does not depend on a private frontend
token or changes to the existing Supabase project. The bound environment draft
remains stale and has not been retried or overwritten.

## Search, collections, save status and remembered sign-in

- [x] Make search responsive without replacing active inputs; preserve typing,
  caret/selection, IME composition, blacklists and account isolation.
- [x] Search collections by song title as well as collection/artist/era/genre;
  add per-collection song search and independent Essentials/Standards/All controls.
- [x] Alphabetical default plus popularity and chronology sorting. Use completed
  plan counts for local popularity and sourced recording release dates for chronology;
  do not invent global chart rankings or original composition dates.
- [x] Add artist/group collection portrait covers with source/attribution, lazy
  loading and an honest fallback when a verified image is unavailable.
- [x] Colored save tracker: explicit unsaved changes, saving and saved states;
  include unapplied form changes and distinguish browser storage from account sync.
- [x] Remember me on sign-in: remember email and persist the session when selected,
  support tab-only sign-in when deselected; never store passwords in app storage.
  Preserve native password-manager autocomplete; browser controls biometric prompts.
- [x] Publish and verify the released build; earlier external blockers remain tracked.

The bound environment draft was re-read once during this follow-up: it remains
revision 2 with an older base than the running configuration. No update/save or
stale retry was attempted. Runtime portrait source/image validation requires
`www.wikidata.org`, `commons.wikimedia.org`, `upload.wikimedia.org` and Apple's
`is1-ssl.mzstatic.com` in a fresh draft preserving the existing repository, settings
and six explicitly allowed hosts. Browser visitors use these public sources
directly; cloud source availability remains unverified. Native biometric prompts
are controlled by the browser/password manager and cannot be forced by the site.



Implementation verification: the full hosted suite passed, including earlier
organization, planning, account-startup, file, blacklist, scoring, audit and
recording-choice checks. Final targeted checks verify persistent active inputs,
IME, direct song matches, independent depth/sort settings, 100-song picker pages
with retained selections, visible colored save states, remembered email and
tab-only reload/new-tab isolation. Sampled searches over all 2,044 records took
about 65–95 ms; the misspelling samples took about 158–183 ms in local/live Chromium.
These are sampled fixture timings, not guarantees for every device.

All 112 unit/database tests passed in release CI, including the tab-only
preference-storage-failure regression. Source dates for all
1,245 recording links come from the existing cached Apple responses. Desktop
and mobile screenshots were inspected. Portrait metadata/bytes and account
requests are synthetic in these fixtures; actual photo delivery, real biometric
prompts and production account/offline recovery remain unverified. No passwords
are retained in app storage, and no real emails/user records were written by tests.

Release `74dada6` is live: [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38459576761)
and [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38459579392)
succeeded. CI passed all 112 tests, MCP type checking, scale checks, the full
hosted browser suite and generated-file consistency. Fourteen public frontend
files match the tested build. The new search/collection/picker and remembered
sign-in/save-badge workflows passed against the published site with TLS
verification enabled, disposable browser profiles and synthetic intercepted
auth/portrait requests. No production user records or emails were written.

- [ ] Validate actual Wikimedia portrait coverage/image delivery after source
  access is available. The loader/fallbacks and safe attribution are tested;
  synthetic images are not evidence of real provider image availability.
- [ ] Confirm real-device native saved-password/biometric prompt behavior with
  remembered email. Existing Apple autofill/sign-in is owner-confirmed; this new
  focus/remembered-email path is fixture-tested, and browser policy controls prompts.

## Artwork, organizations and planning requests

- [x] Add source-backed album covers to contemporary songs, preserving preferred
  recordings and leaving uncertain/unmatched covers blank; add Hymnary finding links.
- [x] Organization workspaces: create, invite by email, accept/decline, multiple
  memberships and easy switching, owner/admin/editor/viewer roles, removal, leaving,
  ownership transfer, shared libraries/plans, fast automatic updates and protected
  concurrent edits. Preserve a private personal workspace for every user.
- [x] Import an existing service from ChatGPT transcription of a screenshot/PDF,
  with a documented JSON format, uncertainty handling and human correction; no
  redundant confirmation for an unambiguous validated import.
- [x] Plan headings and drag ordering; add songs in a modal library picker while
  staying on Plans, allow multiple songs and relative insertion, skip placement
  questions for empty plans; remove the service-role prompt.
- [x] Reframe approval around user-owned libraries with optional starter libraries;
  preserve previous decisions/data, simplify the ordinary interface and plan rules.
- [x] Use Plan History and consistent plan/evaluation/library terminology throughout.
- [x] Edit artist/attribution directly with a pencil affordance and remove its menu action.
- [x] Publish the tested frontend and verify the deployed build. The organization
  backend is applied to the existing Supabase project.

Implemented and tested: 1,245 Apple recording artwork URLs across 780 catalog
records; personal recording lists/removals are preserved. Hymnary uses title-bound
searches, not invented hymn page IDs. Planning import is transcription of the
user's existing service order; it does not choose songs. Approval is organized
with user-owned libraries, with explicit optional migration of previous decisions.

All 105 unit/database tests and the full hosted browser suite passed. The new
three-account browser fixture runs every organization RPC against the real SQL
in isolated PostgreSQL: invitations, acceptance, Personal isolation, role changes,
view-only denial, concurrent independent edits, automatic updates, ownership
transfer, membership removal and multiple workspaces. Plan tests cover desktop
and mobile, escaped inline attribution, headings, drag ordering, multiselection,
certain imports without extra confirmation and uncertain identity/duration review.

The additive organization migration is deployed to project
`inhqxwratimjvzsnuwik`; all four tables have row-level security, direct table writes
are denied, the shared file bucket is private, and pre-existing policies are
unchanged. Anonymous RPC access is denied. Native email login and mandatory email
confirmation were verified without changing authentication settings. The original
Supabase project, personal data and public frontend configuration are preserved.

Release `253f868` is live. [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38437019495)
succeeded, and 14 public frontend files match the tested build. The new planning
and three-account organization fixtures also passed against the public website
with TLS verification enabled, synthetic intercepted auth/email requests and
isolated browser storage. No production user records or emails were created by
those browser tests. These checks verify frontend behavior; they do not establish
real provider email delivery or real-user concurrent sessions.

[App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38437020012)
succeeded for the release: all 105 unit/database tests, MCP type checking, scale
checks, the full hosted browser suite and generated-site consistency passed.
The final view-only file-dialog checks passed locally and on the public site.

- [ ] Verify real-user invitation email delivery and actual account/offline recovery.
  Tests intercept native sign-in email requests to synthetic addresses; they do
  not establish SMTP delivery. Membership requires verified email and acceptance.
  Read-only configuration inspection on October 13 confirmed no custom SMTP
  host or sender is configured; the custom email hook is disabled. Production
  invitation delivery requires provider
  setup and a real delivery test; the native email service is not assumed ready.
- [ ] Validate image downloads from Apple's artwork CDN in the cloud environment.
  This chat's draft is also stale: revision 2 uses an older base than the running
  configuration. No save or repeated retry was attempted. Existing allowed
  domains include both `itunes.apple.com` and `api.song.link`; artwork uses
  `is1-ssl.mzstatic.com`, which needs a fresh configuration draft retaining all
  existing settings. The cloud image request was cancelled; no HTTP status
  or successful image download was observed.

## Discover and song detail follow-up

- [x] Make page scrolling easy from Discover; remove the independent details
  scrollbar and keep selected songs visible while preserving result position.
- [x] Clean up the song heading, give library membership a clear primary action,
  and place secondary controls in a “…” menu.
- [x] Add Details & files, Outside links and Evaluation tabs. Group recording,
  lyric, public-review and source links together; preserve personal data and
  custom detail visibility/order. Let longer content use normal page scrolling.
- [x] Verify desktop/mobile, keyboard tabs, library actions, files, evaluations
  and blacklist behavior. Full hosted checks passed, including the new tab/wheel
  fixture and the previous account, scoring, audit, file and recording regressions.
- [x] Publish the tested build and verify deployed files and browser behavior.

The song detail panel has no independent scrollbar or fixed height. Only the
results list scrolls separately; its boundaries allow normal page scrolling.
Selection reveals the new heading while retaining the list position. Three
keyboard-accessible tabs show one content panel at a time, preserving tab choice
through edits. Existing detail visibility/order, private files, recording choices,
AI modes, personal evaluations and blacklist rules remain intact. No account data
or environment configuration was changed.

Verification: all 97 unit/database tests and the full hosted checks passed. The new browser fixture
passed real wheel scrolling over details, results and result boundaries, deep-list
selection, arrow/Home/End tab navigation, unchanged workspace after tab changes,
primary library management, desktop/mobile layouts and blacklist isolation.
Release `2e3b1b5` is live: [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38419065340)
succeeded. Public app.js and theme.css readback matches the tested build. The
new tab/wheel fixture also passed against the deployed site in a disposable
browser-only workspace with TLS verification enabled, without real account writes.
[App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38419066507)
also succeeded: unit/database, MCP type, scale, hosted browser checks and generated
file consistency all passed.

## Current work

- [x] AI evaluation dialog: comfortable scrolling; preview visibly replaces or
  leads away from the paste area, clear review/apply steps.
- [x] Collection search: normal forward typing, cursor and selection preserved.
- [x] Blacklist: full song information within its own view; excluded from all
  ordinary libraries, search suggestions, imports and new planning choices.
- [x] Discover: selected details visible at any result-list position; results-only
  scrolling and normal page scrolling for song details, with clear mobile transition.
- [x] Pagination: direct page selection, first/last and accessible labels.
- [x] Scoring: explain 0–10 anchors including 10 and 2–3; evidence-based rules;
  reconsider time as arrangement coherence; additional useful criteria.
- [x] Scoring controls: activate/deactivate, add/remove criteria; recompute averages
  across selected assessed criteria without losing stored scores.
- [x] Library audit: explicit ChatGPT prompt, previewed report, charts, explanations,
  strengths/weaknesses, missing evidence; direction, Trinity, voice, tempo,
  lament/celebration and other balance dimensions. No automated service planning.
- [x] Account menu: simplify and move advanced controls to a Settings tab.
- [x] Login: prominent sign-in first; no accidental guest work; preserve old guest data.
- [x] Saving: immediate browser saves, safe account autosave or clear close warning;
  handle offline errors, cross-device conflicts and account changes.
- [x] Password manager form improvements: stable accessible login form and autofill semantics;
  Apple saved email/password autofill and sign-in are now owner-confirmed.
- [x] Verify changes, regenerate docs/, and describe publication status accurately.

## Earlier work to preserve and resume

- Environment draft recovery and domain additions: saved and read back successfully.
- Apple metadata lookup: 1,245 links for 780 records; personal choices/removals
  retained. Unit and hosted checks passed; local Pages output regenerated.
- Spotify/YouTube exact mappings: blocked by Songlink HTTP 401
  `PUBLIC_API_ACCESS_DEPRECATED`; keep searches rather than invented IDs.
- No private Supabase token is needed for frontend development. Existing project
  and public configuration must be preserved.
- Production database isolation is verified below, and Apple saved sign-in is
  owner-confirmed. End-to-end email recovery remains unverified; fixture checks
  must not be described as real-device checks.
- Frontend changes were pushed to main as `594d0ae` and GitHub Pages publication
  succeeded. The production connector scoring function was updated.

## Verification and precise remaining work

Implemented in this checkout and regenerated in docs/. Existing recording work,
public Supabase configuration and personal-data preservation paths were retained.
The preparation turn performed no repository reset, new Supabase project, private
frontend token, push or publication. Continued release work subsequently published
the changes using existing credentials.

Passed: 96 unit/database tests; hosted subdirectory browser checks (including the
new request regression); development browser smoke; targeted login/typing/caret,
scrolling/preview, blacklist, criteria, audit/chart/export and leave-warning checks;
scale checks with 1,000 synthetic songs and plans. The account fixture exercises
autosave and concurrent-write protection without real account writes. A delayed
401 refresh race was reproduced and fixed with a deterministic regression test.
The focused request regression is now included in hosted checks and therefore CI.

- [x] Publish the frontend changes. Release `594d0ae` was pushed to main;
  GitHub App checks and Pages deployment both succeeded. HTTPS readback of app.js,
  accounts.js, autosave.js, scoring.js, library-audit.js and catalog-recordings.js
  exactly matches the tested local files.
- [x] Apply the connector scoring update to production. Updated only
  public.mcp_read_snapshot(), preserving all existing policies, tables and
  function grants. Readback confirms active criteria/customScores support,
  authenticated execution allowed and anonymous execution denied.
- [x] Owner confirmed Apple saved email/password worked on their device. Native
  form and autocomplete behavior remain protected by regression checks.
- [x] Verify deployed database isolation using read-only production role/JWT
  probes: own workspace count 1, other workspace count 0, another identity
  reading the owner count 0, OAuth raw workspaces/profiles counts 0. Anonymous
  REST workspace reads return 401; connector authentication challenge returns 401.
  These are database/endpoint checks, not real-user browser sign-in tests.
- [ ] Verify actual production browser autosave/offline recovery with real test
  accounts. Actual Apple autofill/sign-in is now owner-confirmed; production
  autosave/offline verification remains outstanding; personal workspace data must not be overwritten.
- [ ] Continue Spotify/YouTube lookup when a supported public mapping source exists;
  Songlink still returns PUBLIC_API_ACCESS_DEPRECATED.

Scoring discussion: SCORING-GUIDE.md records score anchors and candidate criteria.
Existing weights are preserved; equal weighting and criterion deactivation are
explicit choices. Library audits describe distributions and uncertainty rather
than generating service selections or universal balance targets. Reports are
previewed/downloaded snapshots; song data and plans are not mutated by an audit.

## Continued release work

The existing GitHub credentials authorize publishing to main. The existing `s`
credential successfully authenticates to the Supabase management API; no new
project or frontend secret is needed. The old production connector function was
backed up outside the checkout before its definition was updated. Its new hash is
`d234214e11011cb366696bd227921b78`; existing policies were compared before/after
and stayed identical. This verifies deployed function configuration, not real
end-to-end OAuth authorization or Apple Passwords on the owner's device.

Release evidence: GitHub App checks run 38396583169 and Pages deployment run
38396581945 both succeeded for 594d0ae. All 96 local tests, hosted request checks
and MCP type checking passed. Public connector metadata responds 200 and its
anonymous request returns the required OAuth 401 challenge.

- [x] Direct live Chromium regression checks. The owner explicitly approved the
  environment proxy certificate trust change after the initial automatic review
  rejection. The supplied CA fingerprint was checked against the verified proxy
  TLS chain. Chromium 154 did not accept NSS imports, so the approved certificate
  was registered in its active profile certificate database, in a dedicated test
  profile. TLS verification remained enabled throughout.

The live GitHub Pages site returned HTTP 200 and passed the full request regression:
sign-in gate and autofill attributes; forward collection typing/caret; selected
song visibility and page jump; focused AI preview; full isolated blacklist; custom
scoring; library audit charts/download; unsaved-edit warnings and mobile layout.
A fresh disposable browser-only workspace was used, with no real account writes.
This completes live frontend verification, not actual Apple Passwords on the
owner's device or end-to-end real-account autosave/offline checks.

The test runner now supports an inherited proxy and an approved public certificate
database. It copies only certificate trust data into a disposable profile, never
account sessions, browser passwords or personal workspaces. The original test
profile remains under /tmp/faithful-live-browser-profile in this environment.
The initial broader trust change was explicitly authorized by the owner; no
certificate-verification disabling or ignore-certificate-errors flag was used.

Songlink's official GitHub API documentation was inspected; it is dated 2020 and
links to a newer help document outside the available network policy. No supported
replacement endpoint was established. Do not repeat the deprecated anonymous API
or label search links as verified Spotify/YouTube recordings.

## Settings and account startup follow-up

- [x] Replace the Settings options panel with grouped line-item rows and consistent
  labels, separators, disclosure arrows and switch controls, including mobile.
- [x] Fix first-open account checking that can remain stuck until refresh.
- [x] Replace plain loading text with a professional, accessible progress state;
  bound slow checks and provide recovery without a page refresh.
- [x] Owner confirmed Apple saved email/password successfully autofilled and signed
  in on their device. Keep the working native form/autocomplete behavior intact.

The expired-session transition previously kept the loading container because it
shared the sign-in form's CSS class. Rendering now distinguishes the two screens
and returns to the existing autofill-compatible form. A single 12-second deadline
covers session validation, refresh requests and waiting for another tab's refresh
lock. After four seconds, users can open their saved account copy or retry. Slow
or offline checks preserve the session and local workspace, pause uploads, and
allow connection recovery from Settings. Canceled late responses cannot clear a
session. No account data or Supabase configuration was changed.

Verification: hosted browser workflows passed, including expired-session recovery
without reloading, delayed startup/progress, timeout with cached-note preservation,
blocked refresh lock cancellation, retry recovery, desktop/mobile Settings and
switch behavior. A dedicated late-response cancellation unit test passed, along
with the existing account suite. Desktop/mobile and loading screenshots were
visually inspected. These provider fixtures do not establish real-account offline
autosave behavior; that earlier verification remains outstanding.

Published as `187c7ea`: [App checks](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38415457052)
and [Pages deployment](https://github.com/williambooth0803-ui/Worship-Song-Tool/actions/runs/38415454323)
both succeeded. All 97 unit/database tests passed; CI also passed MCP type checking,
scale and hosted checks. HTTPS readback of app.js, accounts.js and theme.css matches
the build. The deployed site additionally passed the new startup/Settings browser
fixtures through the approved certificate trust profile with TLS verification on.
Those live frontend checks used synthetic provider responses and disposable
workspaces, with no real-account writes.
