import test from "node:test";
import assert from "node:assert/strict";
import {
  copyPlan,
  songUsage,
  parsePitch,
  rangeSpan,
  elapsedTime,
} from "../public/planning.js";
import { validateWorkspace } from "../public/backup.js";
import { syncCatalog } from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";
import { filterIndex, indexedValue } from "../public/song-index.js";
const state = () =>
  syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "me", name: "Mine", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
const arrangement = {
  id: "acoustic",
  name: "Acoustic",
  key: "D",
  minutes: 4,
  notes: "Use three verses",
  lowNote: "C4",
  highNote: "E5",
  tempo: 80,
  largestLeap: 7,
  wordlessSeconds: 0,
  instrumentalSeconds: 15,
  timeSignature: "4/4",
  vocalDifficulty: "Moderate",
  instrumentalDifficulty: "Easy",
  instruments: ["Piano"],
};
test("independent copied plans reset date and completion status without losing item snapshots", () => {
  const plan = {
    id: "first",
    title: "Sunday",
    date: "2026-10-11",
    status: "completed",
    theme: "Grace",
    passage: "Ephesians 2",
    items: [
      {
        id: "item",
        type: "song",
        songId: "s",
        notes: "My transition",
        key: "D",
        minutes: 4,
        role: "Response",
        arrangementName: "Acoustic",
      },
    ],
  };
  const copy = copyPlan(plan);
  assert.notEqual(copy.id, plan.id);
  assert.notEqual(copy.items[0].id, plan.items[0].id);
  assert.equal(copy.date, "");
  assert.equal(copy.status, "draft");
  copy.items[0].notes = "Changed";
  assert.equal(plan.items[0].notes, "My transition");
  assert.equal(copy.items[0].arrangementName, "Acoustic");
  assert.equal(elapsedTime(3.5), "3:30");
});
test("recorded song history counts completed services once per service", () => {
  const plans = [
    {
      date: "2026-10-11",
      status: "completed",
      items: [
        { songId: "a", type: "song" },
        { songId: "a", type: "song" },
      ],
    },
    {
      date: "2026-10-18",
      status: "ready",
      items: [{ songId: "a", type: "song" }],
    },
  ];
  assert.deepEqual(songUsage(plans, "a"), {
    planned: 2,
    completed: 1,
    lastUsed: "2026-10-11",
  });
});
test("pitch spans, arrangement filters and backup validation use observed musical evidence", () => {
  assert.equal(parsePitch("A4"), 69);
  assert.equal(parsePitch("C♯4"), 61);
  assert.equal(parsePitch("Cb4"), 59);
  assert.equal(parsePitch("invalid"), null);
  assert.equal(parsePitch("B9"), null);
  assert.equal(rangeSpan(arrangement), 16);
  const data = state(),
    song = data.songs[0];
  song.arrangements = [structuredClone(arrangement)];
  song.preferredArrangementId = arrangement.id;
  assert.deepEqual(
    validateWorkspace(data).songs[0].arrangements,
    song.arrangements,
  );
  assert.equal(indexedValue(song, "key", data.profile), "D");
  assert.equal(indexedValue(song, "wordlessSeconds", data.profile), 0);
  assert.equal(
    filterIndex(
      [song],
      {
        rules: [
          { field: "rangeSpan", op: "gte", value: 12 },
          { field: "largestLeap", op: "lte", value: 7 },
        ],
      },
      data.profile,
    ).length,
    1,
  );
  song.arrangements[0].highNote = "B3";
  assert.throws(() => validateWorkspace(data), /lowest vocal note/);
  song.arrangements[0].highNote = "E5";
  song.arrangements[0].instrumentalSeconds = 300;
  assert.throws(() => validateWorkspace(data), /out of range/);
});
