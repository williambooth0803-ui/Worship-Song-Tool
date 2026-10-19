import test from "node:test";
import assert from "node:assert/strict";
import {
  songCollections,
  collectionSongs,
  importSongs,
  songsFromCSV,
  parseCSV,
} from "../public/collections.js";
import {
  allCatalogSongs,
  catalogSongs,
  syncCatalog,
} from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";
import { validateWorkspace } from "../public/backup.js";
const workspace = () =>
  syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "mine", name: "My songs", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
test("depth levels are nested and every collection uses real distinct catalog records", () => {
  assert.ok(songCollections.length >= 55);
  assert.equal(songCollections.filter(c => c.group === "Artists").length, 42);
  for (const pack of songCollections) {
    const essentials = collectionSongs(pack, "essentials"),
      standards = collectionSongs(pack, "standards"),
      all = collectionSongs(pack, "all");
    assert.ok(
      essentials.length <= standards.length && standards.length <= all.length && all.length > 0,
    );
    assert.deepEqual(standards.slice(0, essentials.length), essentials);
    assert.deepEqual(all.slice(0, standards.length), standards);
    assert.equal(new Set(all.map((s) => s.id)).size, all.length);
    assert.ok(all.every((s) => allCatalogSongs.some((c) => c.id === s.id)));
  }
});
test("overlapping and repeated collection imports preserve personal assessments, metadata, approval and backups", () => {
  const state = workspace(),
    song = state.songs.find((s) => s.title === "In Christ Alone");
  song.review.status = "manual";
  song.review.notes = "My reviewed text";
  song.approval = {
    status: "approved",
    notes: "Keep these verses",
    updatedAt: "2026-10-10T12:00:00Z",
  };
  song.metadata = { tags: ["Known by our congregation"] };
  const pack = songCollections.find((p) => p.id === "modern-hymns"),
    songs = collectionSongs(pack, "all");
  const first = importSongs(state, songs, {
    libraryId: "mine",
    collectionId: pack.id,
    depth: "all",
  });
  assert.equal(first.added, songs.filter(s => !state.songs.some(old => old.id === s.id)).length);
  assert.equal(first.saved, songs.length);
  const again = importSongs(first.workspace, songs, {
    libraryId: "mine",
    collectionId: pack.id,
    depth: "all",
  });
  assert.equal(again.added, 0);
  assert.equal(again.saved, 0);
  const restored = validateWorkspace(
    JSON.parse(JSON.stringify(again.workspace)),
  );
  const kept = restored.songs.find((s) => s.id === song.id);
  assert.equal(kept.review.notes, "My reviewed text");
  assert.equal(kept.approval.status, "approved");
  assert.deepEqual(kept.metadata.tags, ["Known by our congregation"]);
  assert.equal(restored.collectionImports.length, 2);
  assert.deepEqual(syncCatalog(restored), restored);
  assert.equal(
    state.songs.length,
    catalogSongs.length,
    "imports do not mutate the original state",
  );
});
test("CSV preview handles quoted commas, newlines, BOM, duplicates and malformed files", () => {
  assert.deepEqual(
    parseCSV('\uFEFFTitle,Author\r\n"A, title","Name ""quoted"""\r\n'),
    [
      ["Title", "Author"],
      ["A, title", 'Name "quoted"'],
    ],
  );
  assert.deepEqual(parseCSV('Title,Author\n"A\nB",Writer'), [
    ["Title", "Author"],
    ["A\nB", "Writer"],
  ]);
  const songs = songsFromCSV(
    'Title,Attribution,Themes,Preferred Key\nNew song,Me,"Grace; Hope",D\nNew song,Me,Grace,D',
  );
  assert.equal(songs.length, 1);
  assert.equal(songs[0].review.key, "D");
  assert.deepEqual(songs[0].themes, ["Grace", "Hope"]);
  assert.equal(songs[0].review.status, "unreviewed");
  assert.throws(() => songsFromCSV("Author\nMe"), /Title/);
  assert.throws(() => songsFromCSV('Title\n"Unclosed'), /unclosed/);
  assert.throws(() => songsFromCSV("Title,Author\n,Me"), /row 2/);
});
