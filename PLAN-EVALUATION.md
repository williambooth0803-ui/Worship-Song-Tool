# Plan and library evaluations

**Evaluate plan** and **Run Library Audit** open the same words-first tool. Choose
the existing plans/libraries, criteria and purpose. Tempo/timing and key/range
checks are separate opt-ins under **Optional musical checks**. Unselected musical
measurements are absent from the copied snapshot, and the request excludes
discussion of unrequested missing data.

The header's **Close** button stays outside the scrolling form/report. **Done**
and Escape also close it. Reports describe human choices without selecting songs,
reordering plans, changing ratings or assigning a worship-quality score.

## Coverage and lyrical emphasis

The v2 response describes distinct lyrical sections and multiple ideas per section.
A song can address several themes, use multiple voices and combine functions.
Source evidence may be complete, partial or unverified. Unsupported text cannot
supply invented measurements. Evidence uses original prose, brief quotations,
public sources and a consistent topic vocabulary.

- **Coverage** counts distinct songs with evidence of an idea. One substantive
  line registers presence. Plan occurrence counts are shown separately.
- **Lyric emphasis** divides an idea's weighted line count by all reviewed lyric
  line occurrences. Section line counts are multiplied by repetitions. Multiple
  ideas may occur in the same line, so percentages need not total 100.
- **Repetition pattern** uses explicitly supplied published counts, or once for
  unmarked sections. It never assumes every chorus repeats twice. Adjust any
  verse, chorus or bridge, including 0 for an omitted section. Repeated plan
  occurrences have independent controls.
- These are proportions of reviewed lines, not elapsed time, word-level semantic
  precision, a measurement of actual singing, or a test of adequacy. One confession
  line can be meaningful without dominating. Prose findings explain the substance
  in the user's context. Actual performance patterns require review. Unknown or
  partial text does not prove the absence of an idea.

The compact table fits on mobile. Expand **Song-by-song idea map** for overlapping
presence evidence and within-song proportions. Large scopes page through eight
song columns; aggregates still use the full scope. Libraries count distinct songs
and their combined pool is a union. Plans retain repeated occurrences. Missing or
No Approval records remain unavailable.

Old v1 workspace reports remain readable as presence evidence. Their single labels
cannot establish section proportions; repeat-weighted emphasis needs a fresh v2
evaluation. The old standalone library-audit parser remains for compatibility,
while the main library entry uses the unified evaluator.

## Evaluation History

A valid preview in an editable workspace saves to **Evaluation History**
automatically. Repetition edits update the preview immediately; **Save repetition
changes** retains a new immutable version. Identical re-previews are deduplicated.

Open history from a plan/library or **All evaluation history** on Plans. Reports
retain original names, lens principles, criteria, selected snapshot, evidence,
sources and pattern after plans change. Raw opted-in song words are not duplicated
in the archive. Reopen, download or explicitly delete reports without editing plans.

History belongs to the current personal/shared workspace. It uses existing device
saving and authenticated account/organization autosave. Backups, restores, conflict
handling and version snapshots retain it. Concurrent new reports merge by ID.
Full AI content is required to display reports. Shared viewers may read/download
history but cannot save/delete it. Storage failures leave the report available
for download/retry instead of claiming a successful save.

History is bounded at 100 reports and 2 MB, with no automatic eviction. New saves
also preserve the existing 5 MB workspace-backup limit. When full, download/remove
older reports. Existing archives are never silently trimmed to make room.

`supabase/migrations/20261027154912_preserve_evaluation_history.sql` adds row-local update guards so older cached
clients omitting the new field cannot erase history. Explicit arrays, including
an empty array after deletion, remain authoritative. Existing RLS, organization
roles and revision checks stay in effect. Generated migrations deploy through
Supabase's connected GitHub integration. **Deploy workspace history** tests the
guards on pushes; its manual dispatch can reapply the legacy history SQL using a
valid encrypted deployment credential. That older token currently returns 401;
it is not required for the connected integration or normal app history saving.

## Adding songs while planning

**Plans → Add songs** has **Libraries**, **All songs** and **New song** tabs.
All songs includes available workspace/catalog records; No Approval stays excluded.
New song creates an unrated draft with human-entered details. Selection, search and
insertion position remain in the picker across sources.

Nothing commits until **Add N songs to plan**. Workspace records and plan items
save together; cancellation keeps the original workspace. New/catalog songs do
not require library membership. Existing human notes, ratings and arrangements
are not overwritten. Shared view-only access cannot create or add records.
