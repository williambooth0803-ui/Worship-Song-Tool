# Faithful Repertoire request ledger

Keep this file current when continuing work. Read README.md, DESIGN.md and this
ledger at the start of a task. Resume unfinished requests after interruptions;
do not treat a new prompt as cancellation unless the owner says so. Mark an item
complete only with implementation and meaningful verification. Record external
blockers explicitly. Preserve personal assessments, recordings and workspaces.

## Current work

- [x] AI evaluation dialog: comfortable scrolling; preview visibly replaces or
  leads away from the paste area, clear review/apply steps.
- [x] Collection search: normal forward typing, cursor and selection preserved.
- [x] Blacklist: full song information within its own view; excluded from all
  ordinary libraries, search suggestions, imports and new planning choices.
- [x] Discover: selected details visible at any result-list position; independent
  scrolling on desktop and clear mobile transition.
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
  actual Apple Passwords/Safari verification remains a live-device check.
- [x] Verify changes, regenerate docs/, and describe publication status accurately.

## Earlier work to preserve and resume

- Environment draft recovery and domain additions: saved and read back successfully.
- Apple metadata lookup: 1,245 links for 780 records; personal choices/removals
  retained. Unit and hosted checks passed; local Pages output regenerated.
- Spotify/YouTube exact mappings: blocked by Songlink HTTP 401
  `PUBLIC_API_ACCESS_DEPRECATED`; keep searches rather than invented IDs.
- No private Supabase token is needed for frontend development. Existing project
  and public configuration must be preserved.
- Production cross-account isolation, email recovery and Apple Passwords need
  live verification; fixture checks must not be described as those checks.
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
- [ ] Verify actual Apple Passwords on the owner's Safari/device/extension. Native
  forms, unique field IDs, correct autocomplete and DOM-only autofill are checked;
  those checks do not prove Apple integration on a real device.
- [x] Verify deployed database isolation using read-only production role/JWT
  probes: own workspace count 1, other workspace count 0, another identity
  reading the owner count 0, OAuth raw workspaces/profiles counts 0. Anonymous
  REST workspace reads return 401; connector authentication challenge returns 401.
  These are database/endpoint checks, not real-user browser sign-in tests.
- [ ] Verify actual production browser autosave/offline recovery with real test
  accounts and actual Apple Passwords. Dedicated account/device verification
  remains outstanding; personal workspace data must not be overwritten.
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

Direct live Chromium validation encountered ERR_CERT_AUTHORITY_INVALID because
Chromium does not trust the environment proxy CA. Automatic approval review
rejected importing it into Chromium's persistent NSS store: that broadens TLS
trust beyond this site and requires explicit authorization. No trust bypass or
certificate-verification disabling was used. HTTPS asset checks use the existing
trusted Node/proxy route; full browser workflow checks use the hosted test server.
An approval question for this precise trust change remains pending.

Songlink's official GitHub API documentation was inspected; it is dated 2020 and
links to a newer help document outside the available network policy. No supported
replacement endpoint was established. Do not repeat the deprecated anonymous API
or label search links as verified Spotify/YouTube recordings.
