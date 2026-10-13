# Faithful Repertoire request ledger

Keep this file current when continuing work. Read README.md, DESIGN.md and this
ledger at the start of a task. Resume unfinished requests after interruptions;
do not treat a new prompt as cancellation unless the owner says so. Mark an item
complete only with implementation and meaningful verification. Record external
blockers explicitly. Preserve personal assessments, recordings and workspaces.

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
- [ ] Publish the tested build and verify deployed files and browser behavior.

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
