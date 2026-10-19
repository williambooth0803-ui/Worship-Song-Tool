# The 835-record working catalog

The owner requested a smaller, more familiar default repertoire for browsing and
batch AI work. The previous catalog contained 2,044 song/version records, including
1,043 entries from a later artist-title expansion. That expansion often repeated
songs under another recording association or added album-depth selections.

The current list keeps 807 records from the core hymn, seasonal, gospel, modern
hymn, worship and CCM collection and 28 recognizable artist selections. It retires
194 core selections and 1,015 later expansion entries: 1,209 fewer defaults.
All 42 artist groups remain represented. The exact retained artist IDs and retired
core IDs are frozen in `public/catalog-selection.js`; no rating threshold decides
inclusion. Distinct texts named Nothing but the Blood and Ancient of Days remain
separate. All 69 starter-workspace records remain available.

This is an editorial shortlist for practical use, not a claim that every entry
holds a measured chart position. Familiar songs, recurring church repertoire,
seasonal usefulness and coverage across traditions guided the selection. The
public PraiseCharts *Top 100 Worship Songs of 2025* page was also consulted:
https://www.praisecharts.com/song-lists/top-100-worship-songs-of-2025
Its accessible page showed a limited preview, including Holy Forever, I Know a
Name and Trust in God; those existing records were kept. The public CCLI chart
search result was available, but direct retrieval returned 403. No SongSelect
account was used and no unavailable ranking was inferred.

Reduction changes only preloaded discovery/collections and their analysis manifest.
It never deletes workspace songs, reviews, notes, recordings, files, libraries,
plans or approval history. Existing retired versions remain usable in the owner's
index, libraries and plans. Their saved evaluations remain; historical public
research and recording evidence remain in Git history and authored source files.
New songs and other versions can still be entered or imported explicitly.

On October 19, 2026, the owner explicitly discarded all 24 unresolved defaults
listed in `../catalog-analysis/identity-issues.json` (22 core and two artist
entries). At that checkpoint, all 976 remaining defaults have expanded text evaluations.

The owner then chose to keep All of a Sudden and Lord of the Dance, retain the
seven songs strictly above 8.5 for further review, and retire the other 141 from
the 150-song shortlist. `decisions-150.json` freezes these choices against exact
IDs and the original scores. Those 141 are part of `retiredCoreIds`; the shortlist
data is static, so later score changes cannot silently change catalog inclusion.
All 835 remaining defaults have expanded evaluations.

`review-150.md` and `review-150.csv` retain the original list, ratings and owner
decisions. The list is editorial, not a measured popularity ranking. Its numbers
are stable artist-grouped references. Original high-rating flags use the app's
default weighted text score (35 accuracy, 30 substance, 20 language), normalized
over assessed criteria. Arrangement coherence remains unassessed. The original
8.0+ flags are separate from the owner's strict above-8.5 keep-for-review rule.

The public `review.html` flashcards start with the seven deferred songs and the
owner's prior decisions. They offer Keep, Remove, Decide later, notes, undo,
keyboard navigation, evaluations, lyric/listening links and browser save/resume.
JSON backups merge newer decisions; CSV and copied-number summaries make choices
reviewable in chat. These drafts never mutate catalog defaults, workspaces or
account data. The page uses public catalog ratings, not personal lens evaluations.
