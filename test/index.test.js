import test from "node:test";
import assert from "node:assert/strict";
import {
  indexFields,
  indexedValue,
  filterIndex,
  indexEntries,
  matchesIndexRule,
  indexCSV,
} from "../public/song-index.js";
import {
  criteriaEvidence,
  validateCriteriaResults,
} from "../public/criteria.js";
import { workspaceSignature, saveLabel } from "../public/saving.js";
import { validateWorkspace } from "../public/backup.js";
import { syncCatalog } from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";
import { textStats } from "../public/text-stats.js";
const workspace = () =>
  syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "me", name: "My songs", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
test("whole-word, phrase, negative, Unicode and sharp-key lookup remain distinct", () => {
  assert.equal(
    matchesIndexRule("graceful mercy", { op: "word", value: "grace" }),
    false,
  );
  assert.equal(
    matchesIndexRule("Grace and mercy", { op: "word", value: "grace" }),
    true,
  );
  assert.equal(
    matchesIndexRule("Praise\n the Lord", {
      op: "contains",
      value: "praise the lord",
    }),
    true,
  );
  assert.equal(
    matchesIndexRule(["Grace", "Mercy"], { op: "excludes", value: "grace" }),
    false,
  );
  assert.equal(matchesIndexRule("C♯", { op: "equals", value: "C#" }), true);
  assert.equal(matchesIndexRule("C#", { op: "equals", value: "C" }), false);
  assert.equal(
    matchesIndexRule("Die Güte", { op: "word", value: "güte" }),
    true,
  );
  assert.equal(matchesIndexRule(null, { op: "lte", value: 5 }), false);
  assert.equal(matchesIndexRule(0, { op: "present" }), true);
});
test("combined numeric and custom filters, word concordance and metadata survive backups", () => {
  const state = workspace(),
    song = state.songs[0];
  song.metadata = {
    lyrics: "Grace, grace and faithful mercy.",
    tempo: 80,
    themes: ["Mercy"],
    custom: [{ name: "Hymnal number", type: "number", value: 123 }],
  };
  song.review.key = "D";
  const restored = validateWorkspace(state);
  assert.equal(restored.songs[0].metadata.lyrics, song.metadata.lyrics);
  assert.deepEqual(
    filterIndex(
      restored.songs,
      {
        rules: [
          { field: "lyrics", op: "word", value: "grace" },
          { field: "tempo", op: "lte", value: 90 },
          { field: "custom:hymnal number", op: "gte", value: 100 },
        ],
      },
      state.profile,
    ).map((s) => s.id),
    [song.id],
  );
  assert.equal(
    indexEntries([song], "words", state.profile).find(
      (e) => e.value === "grace",
    ).count,
    1,
  );
  assert.ok(
    indexFields(restored.songs).some(
      (f) => f.id === "custom:hymnal number" && f.type === "number",
    ),
  );
  song.metadata.custom.push({
    name: "Hymnal Number",
    type: "text",
    value: "duplicate",
  });
  assert.throws(() => validateWorkspace(state), /duplicate/);
});
test("hidden AI interpretations are absent from index search, metrics, CSV and criteria payloads", () => {
  const state = workspace(),
    song = state.songs[0];
  song.review.previous = structuredClone(song.review);
  song.review.status = "ai";
  song.review.summary = "private AI interpretation";
  song.review.claims = ["AI only claim"];
  song.review.scores.substance = 2;
  song.themes = ["AI exclusive"];
  state.profile.aiMode = "manual";
  assert.deepEqual(
    filterIndex([song], { query: "private AI interpretation" }, state.profile),
    [],
  );
  assert.deepEqual(
    filterIndex(
      [song],
      { rules: [{ field: "themes", op: "equals", value: "AI exclusive" }] },
      state.profile,
    ),
    [],
  );
  assert.notEqual(indexedValue(song, "substance", state.profile), 2);
  assert.ok(
    !indexCSV([song], indexFields([song]), state.profile, []).includes(
      "private AI interpretation",
    ),
  );
  assert.ok(
    !JSON.stringify(criteriaEvidence(song, state.profile)).includes(
      "private AI interpretation",
    ),
  );
  state.profile.aiMode = "full";
  assert.equal(
    filterIndex([song], { query: "private AI interpretation" }, state.profile)
      .length,
    1,
  );
});
test("AI criteria results reject invented songs, fabricated evidence and unsupported matches", () => {
  const songs = [{ id: "1", title: "A song", text: "God is faithful." }];
  const valid = {
    results: [
      {
        id: "1",
        fit: "likely",
        reason: "Names faithfulness.",
        evidence: ["God is faithful."],
      },
    ],
  };
  assert.equal(validateCriteriaResults(valid, songs)[0].fit, "likely");
  for (const item of [
    { ...valid.results[0], id: "invented" },
    { ...valid.results[0], evidence: ["Never supplied"] },
    { ...valid.results[0], evidence: [] },
  ])
    assert.throws(() => validateCriteriaResults({ results: [item] }, songs));
  assert.throws(() => validateCriteriaResults({ results: [] }, songs));
});
test("save status compares stable JSONB values and leaves newer local edits unsaved", () => {
  assert.equal(
    workspaceSignature({ b: 1, a: 2 }),
    workspaceSignature({ a: 2, b: 1 }),
  );
  assert.notEqual(workspaceSignature([1, 2]), workspaceSignature([2, 1]));
  const state = workspace(),
    status = { signature: workspaceSignature(state) };
  assert.equal(saveLabel(status, state), "Saved to your account");
  state.songs[0].review.notes = "Newer change";
  assert.match(saveLabel(status, state), /Saved in this browser/);
});
test("text counts distinguish missing full text, interior words and meaningful praise", () => {
  assert.equal(textStats({ firstLine: "Just as I am" }).justCount, null);
  const song = {
    metadata: {
      lyrics:
        "Just as I am\nWe just sing truth\nOh, oh, alleluia\nWe just sing truth",
    },
  };
  assert.equal(textStats(song).justCount, 3);
  assert.equal(textStats(song).interiorJust, 2);
  assert.equal(textStats(song).ohCount, 2);
  assert.equal(textStats(song).repeatedLines, 1);
  song.metadata.lyrics = "We praise you";
  assert.equal(
    textStats(song).justCount,
    0,
    "text updates invalidate cached counts",
  );
});
