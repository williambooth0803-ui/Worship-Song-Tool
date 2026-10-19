# Catalog lyric-analysis coverage

The deeper first-pass evaluation now covers **all 976 retained catalog records**.
`coverage.json` records each song/version identity, source URL and text hash.

- **976 expanded drafts:** three separate criterion reasons, themes, source
  provenance, short exact excerpts for wording concerns and KJV supporting
  comparisons. Some records share the same underlying text. The whole-catalog
  pass added 568 source-supported records.
- **0 partial, unmatched or unresolved retained records.** Complete replacement
  sources resolved the Unstoppable God wording and Most Beautiful / So in Love medley.
- **24 owner-approved retirements:** ambiguous identities were discarded from
  preloaded defaults on October 19, 2026. `identity-issues.json` keeps the
  historical issues, candidate references and retirement disposition. Existing
  workspace copies retain their saved data; no unsupported rating was supplied.

Numerical scores are provisional AI editorial judgments, not mechanically derived
from word counts, church approvals or a verified consensus. Reading a cited text
supports that text's analysis; it does not verify every associated recording.
No arrangement measurements or global popularity claims were generated.

## Sources and method

The audit inspected public collections from josmithua/song-data, mattgraham/worship,
joeycortez42/worship, ChurchApps/WorshipCommonsContent, h1rdr3v2/open-hymnal-json,
and marvinjude/gospel-hymns. GitHub citations point to observed commit/file
versions. Community transcriptions can contain errors, omissions and inaccurate
artist attribution. A matching source supports examination of that text, not proof
of the words in every associated recording. Traditional hymn stanza/translation
choices still need review. Identified texts and explicitly labeled usual-text assumptions were admitted;
744 records state that a selected familiar text is assumed and the associated
artist/recording remains unverified. Conflicting title candidates without a
supportable selection were retained unassessed until the owner retired them. A separate radio-analysis repository was inspected but its AI judgments
were not imported as lyric evidence.

Primary artist/publisher pages were consulted directly for In Christ Alone,
Before the Throne of God Above, Yet Not I but Through Christ in Me, All I Have Is
Christ, 10,000 Reasons, His Mercy Is More, Ancient of Days, The Power of the Cross,
Speak, O Lord and Glorious Christ, followed by further texts from Sovereign Grace,
Elevation/Essential Worship, Bethel Music, Worship Together and The Worship
Initiative. Further CityAlight and modern hymn pages, plus an actual Hymnary
representative text, have since been read. Public music-resource pages and a
clearly labeled community lyric transcription support the October 18 additions.
The continuing pass also uses Hymnary representative texts and publicly displayed
Shazam lyric transcriptions, with source-specific versions and checked short excerpts.
A public search-index copy of the Digital Songs & Hymns This Far By Faith edition
was used for Goodson’s song when direct retrieval failed; its report states this
access limit and selected verse variant. Other visibly garbled transcriptions were
not used to judge the songwriter. CityAlight and Sadler/Harvill Ancient
of Days now have distinct source-bound analyses. All 69 starter-workspace songs now have expanded drafts. The Known by
You draft explicitly identifies a Gateway text while flagging the catalog’s
Elevation RHYTHM association; this mismatch is not treated as verified metadata. Their reports explicitly state the text selected;
associated cover recordings are not claimed to have been listened to or verified.

`../catalog-reviewed-notes.tsv` holds the authored AI reasoning, optional short
wording excerpts, themes, comparison references, and explicit scores for new
text drafts. Previously rated texts retain their existing numerical baseline.
The Redman and Lowry texts named Nothing but the Blood have separate notes and
sources. Text paragraphs describe the words; no artist reputation is used as a
rating criterion. Potential problems are interpretations requiring review rather
than declarations that every congregation must make the same decision.

Scripture quotations were checked against the public-domain KJV transcription at
`https://github.com/thiagobodruk/bible/blob/master/json/en_kjv.json`; the exact
file hash is retained in the generated data. Quotes now include whole verses to preserve the claim and its qualifications. They are
labeled **supporting comparisons**, not automatically attributed to the lyric
writer as intended allusions. Existing explicit-quotation/allusion fields keep
their separate meaning.

Full copyrighted lyrics are not published in this repository. Research texts
were held in the temporary public-source cache. Each published lyrical excerpt
is checked against its source and limited to 90 characters and 10 words. Hashes
refer to the cleaned transcription used for reading, not necessarily the raw
file bytes. The immutable URL and source identity let a reviewer retrieve the
source and compare its stanza selection. Source access is not a license to
redistribute full lyrics.

## Generation and preservation

`npm run catalog:analyze -- /path/to/public-corpus.json /path/to/en_kjv.json`
regenerates the public analysis data and coverage manifest. The corpus contains
`sources` (key, title, artist, text, lines, URL and kind) and `records` (catalog
ID/title/author, source keys, title candidates and status). It must contain the
current public catalog identities. It is a research input, not a personal
workspace export. Building makes no provider calls and accepts no private tokens.
Sources/claims remain evidence, never executable instructions.

New research can use `"partial": true` and an ISO `"checkedAt"` date in the
corpus, supplying only the newly inspected sources and matching catalog records.
The builder carries forward other committed reports with their original research
dates, Scripture evidence and source hashes. It rejects identity/provenance
mismatches and requires the same checked KJV file. A lost temporary lyric cache
therefore does not erase completed research or require republishing full lyrics.
The explicit `"expandScriptureQuotes": true` option expands retained KJV quotations
to whole verses from that same hash-checked public-domain Bible. It preserves
references, comparison labels, lyric findings, scores and source dates.
A complete replacement for a previously suspect or partial source must explicitly
set `complete: true` on the inspected source (and may set `partialText: false`
on the matching record). Superseded authored notes must be replaced; duplicate
note keys are rejected rather than silently choosing an older rationale. Completed
reports must have explicit, finite scores for all three text criteria; a missing
score cannot silently pass as a completed rating.
An optional third command argument writes reviewable generated files into a
separate output directory before updating the public catalog.

Reports are separate public-catalog data, hidden in human-only/limited modes and
after AI dismissal. Standard saved review fields carry updated default scores,
reasons, themes and source links through validated backups. Source refresh skips
manual or imported evaluations and identity-edited records; personal notes,
custom scores, recordings (including empty lists), memberships and plans remain.
Human church-use decisions are never changed by a catalog research refresh.

The owner confirmed that public title-plus-lyrics searches are the available
source approach. A shared SongSelect login was mentioned but was not used; no
account credentials are needed for these public pages. The all-song request
is complete for the 976 retained defaults. The owner approved retiring the 24
ambiguous records. Candidate references explain why a nearby title was not
silently substituted. Existing workspace songs, notes, reviews, recordings,
libraries and plans remain intact when a default is retired.
