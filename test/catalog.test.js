import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogSongs,
  allCatalogSongs,
  syncCatalog,
  CATALOG_REVISION,
  discoverSongs,
  invalidateApproval,
} from "../public/catalog.js";
import { seedSongs } from "../public/seeds.js";
import { defaultProfile } from "../public/core.js";
import { validateWorkspace } from "../public/backup.js";
import { indexedValue } from "../public/song-index.js";

const oldWorkspace = () =>
  structuredClone({
    version: 1,
    songs: seedSongs,
    profile: defaultProfile,
    libraries: [
      { id: "personal", name: "My repertoire", songIds: ["amazing-grace"] },
    ],
    plans: [],
  });
test("catalog expansion is idempotent and keeps saved songs and personal reviews", () => {
  const old = oldWorkspace();
  old.songs[1].review.status = "manual";
  old.songs[1].review.notes = "My notes";
  old.songs[1].review.scores.substance = 5;
  const migrated = syncCatalog(old);
  assert.equal(migrated.songs.length, catalogSongs.length);
  assert.equal(old.songs.length, 4);
  assert.deepEqual(migrated.libraries, old.libraries);
  assert.deepEqual(migrated.songs[1].review, old.songs[1].review);
  assert.equal(migrated.songs[1].catalogReview.scores.substance, 8);
  assert.deepEqual(syncCatalog(migrated), migrated);
  assert.deepEqual(validateWorkspace(migrated), migrated);
});
test("catalog updates preserve manual overrides and invalidate outdated starter approval", () => {
  const state = syncCatalog(oldWorkspace());
  state.songs[0].approval.status = "approved";
  state.songs[1].approval.status = "approved";
  state.songs[1].review.status = "manual";
  state.songs[1].review.notes = "Keep this";
  const revised = structuredClone(catalogSongs);
  revised[0].review.summary = "Revised evidence";
  revised[1].review.scores.substance = 7;
  const next = syncCatalog(state, revised, CATALOG_REVISION + 1);
  assert.equal(next.songs[0].review.summary, "Revised evidence");
  assert.equal(next.songs[0].approval.status, "unreviewed");
  assert.equal(next.songs[1].approval.status, "approved");
  assert.equal(next.songs[1].review.notes, "Keep this");
  assert.equal(next.songs[1].catalogReview.scores.substance, 7);
});
test("catalog draft refresh keeps personal notes and recorded musical settings", () => {
  const workspace = oldWorkspace();
  const original = workspace.songs[0];
  Object.assign(original.review, {
    notes: "Retain my church's notes",
    key: "D",
    minutes: 3.5,
    musical: "Observed octave leap in our arrangement",
  });
  const updated = syncCatalog(workspace).songs.find(
    (s) => s.id === original.id,
  );
  assert.equal(updated.review.status, "ai");
  for (const key of ["notes", "key", "minutes", "musical"])
    assert.equal(updated.review[key], original.review[key]);
});
test("approval resets after an assessment changes without erasing decision notes", () => {
  const song = {
    approval: {
      status: "context",
      notes: "Teach this first",
      updatedAt: new Date().toISOString(),
    },
  };
  invalidateApproval(song);
  assert.equal(song.approval.status, "unreviewed");
  assert.equal(song.approval.notes, "Teach this first");
});
test("discovery filters and sort order respect unknown scores", () => {
  const songs = syncCatalog(oldWorkspace()).songs;
  songs[0].approval.status = "approved";
  assert.equal(
    discoverSongs(songs, { approval: "approved" }, defaultProfile).length,
    1,
  );
  assert.ok(
    discoverSongs(songs, { theme: "Grace" }, defaultProfile).every((s) =>
      s.themes.includes("Grace"),
    ),
  );
  const sorted = discoverSongs(songs, { sort: "substance" }, defaultProfile);
  assert.ok(
    sorted[0].review.scores.substance >= sorted.at(-1).review.scores.substance,
  );
  assert.equal(songs[0].id, "holy-holy-holy");
});
test("catalog drafts cover all titles with explicit AI provenance and no inferred arrangements", () => {
  assert.equal(
    new Set(allCatalogSongs.map((s) => s.id)).size,
    allCatalogSongs.length,
  );
  assert.ok(allCatalogSongs.length >= 250);
  for (const song of allCatalogSongs) {
    assert.equal(song.review.status, "ai");
    assert.ok(Number.isFinite(song.review.scores.accuracy));
    assert.equal(song.review.scores.time, null);
    assert.ok(
      !song.review.musical || song.review.musical.startsWith("Not assessed"),
    );
    assert.ok(song.review.aiFields.includes("scores"));
    assert.match(song.review.model, /exact text not verified/);
  }
  for (const artist of [
    "Elevation Worship",
    "Bethel Music",
    "Hillsong",
    "The Worship Initiative",
    "Sovereign Grace",
  ])
    assert.ok(allCatalogSongs.some((s) => s.author.includes(artist)));
  assert.match(
    allCatalogSongs.find(
      (s) => s.author.includes("Kari Jobe") && s.title.startsWith("Forever"),
    ).review.notes,
    /work was finished on the cross/,
  );
});
