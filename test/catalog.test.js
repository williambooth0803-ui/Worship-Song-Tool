import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogSongs,
  allCatalogSongs,
  syncCatalog,
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
  assert.equal(migrated.songs.length, 40);
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
  const next = syncCatalog(state, revised, 2);
  assert.equal(next.songs[0].review.summary, "Revised evidence");
  assert.equal(next.songs[0].approval.status, "unreviewed");
  assert.equal(next.songs[1].approval.status, "approved");
  assert.equal(next.songs[1].review.notes, "Keep this");
  assert.equal(next.songs[1].catalogReview.scores.substance, 7);
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
test("catalog has distinct traditional and modern titles without invented assessments", () => {
  assert.equal(new Set(allCatalogSongs.map((s) => s.id)).size, 215);
  assert.equal(
    catalogSongs.filter((s) => s.review.status === "starter").length,
    20,
  );
  for (const song of allCatalogSongs) {
    assert.ok(["starter", "unreviewed"].includes(song.review.status));
    if (song.review.status === "unreviewed") {
      assert.ok(Object.values(song.review.scores).every((s) => s === null));
      assert.deepEqual(song.review.claims, []);
      assert.equal(song.firstLine, "");
      assert.equal(indexedValue(song, "concern", defaultProfile), "Unassessed");
    }
    assert.equal(song.review.scores.time, null);
    assert.match(song.review.musical, /^Not assessed/);
  }
});
