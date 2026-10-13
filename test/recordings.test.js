import test from "node:test";
import assert from "node:assert/strict";
import { recordingLinks, recordingSearchLinks, recordingURL, validateRecordings } from "../public/recordings.js";
import { allCatalogSongs, syncCatalog } from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";
import { validateWorkspace } from "../public/backup.js";
import { catalogRecordings } from "../public/catalog-recordings.js";

const spotify = "https://open.spotify.com/track/0123456789012345678901";
const youtube = "https://www.youtube.com/watch?v=abcdefghijk";
const apple = "https://music.apple.com/us/album/song-name/123456?i=654321";

test("every catalog record has three title-bound searches, distinct from exact recordings", () => {
  for (const song of allCatalogSongs) {
    const links = recordingLinks(song);
    assert.equal(links.length, 3);
    for (const link of links) {
      assert.equal(link.exact, false);
      assert.ok(decodeURIComponent(link.url).includes(song.title));
    }
  }
  const modern = recordingSearchLinks({ title: "Goodbye Yesterday", author: "Associated recording: Elevation RHYTHM", category: "worship" });
  assert.equal(new URL(modern.youtube).searchParams.get("search_query"), "Goodbye Yesterday Elevation RHYTHM");
  const hymn = recordingSearchLinks({ title: "Amazing Grace", author: "John Newton", category: "traditional" });
  assert.equal(new URL(hymn.appleMusic).searchParams.get("term"), "Amazing Grace hymn");
});

test("song URLs accept provider share links and discard tracking without losing song identity", () => {
  assert.equal(recordingURL("spotify", "https://open.spotify.com/intl-de/track/0123456789012345678901?si=tracking"), spotify);
  assert.equal(recordingURL("appleMusic", "https://itunes.apple.com/us/album/song-name/id123456?i=id654321&app=music"), apple);
  assert.equal(recordingURL("appleMusic", "https://music.apple.com/us/song/song-name/654321?ls=1"), "https://music.apple.com/us/song/song-name/654321");
  assert.equal(recordingURL("youtube", "https://youtu.be/abcdefghijk?si=tracking&t=90"), youtube + "&t=90");
  assert.equal(recordingURL("youtube", "https://music.youtube.com/watch?v=abcdefghijk&list=unused"), youtube);
  assert.equal(recordingURL("youtube", "https://www.youtube.com/live/abcdefghijk?feature=share"), youtube);
});

test("recordings reject search, album-only, unsafe and disguised external URLs", () => {
  for (const [provider, url] of [
    ["spotify", "https://open.spotify.com/album/0123456789012345678901"],
    ["spotify", "https://open.spotify.com/search/song"],
    ["appleMusic", "https://music.apple.com/us/album/example/123456"],
    ["youtube", "https://www.youtube.com/results?search_query=test"],
    ["youtube", "https://www.youtube.com/playlist?list=abcd"],
    ["youtube", "https://youtube.com.evil.test/watch?v=abcdefghijk"],
    ["youtube", "https://evil.test@youtube.com/watch?v=abcdefghijk"],
    ["youtube", "https://youtube.com:444/watch?v=abcdefghijk"],
    ["youtube", "javascript:alert(1)"],
    ["youtube", "http://youtube.com/watch?v=abcdefghijk"],
    ["unknown", youtube],
  ]) assert.throws(() => recordingURL(provider, url), /HTTPS/);
});

test("multiple versions and preferred ordering survive workspace backup and catalog refresh", () => {
  const workspace = syncCatalog({version: 1, profile: defaultProfile, songs: [], libraries: [{id: "mine", name: "My songs", songIds: []}], plans: []});
  workspace.songs[0].recordings = [
    { id: "acoustic", provider: "youtube", label: "Acoustic", url: youtube },
    { id: "album", provider: "youtube", label: "Album", url: "https://www.youtube.com/watch?v=lmnopqrstuv" },
    { id: "apple", provider: "appleMusic", label: "Album", url: apple },
  ];
  const saved = validateWorkspace(JSON.parse(JSON.stringify(workspace)));
  assert.deepEqual(saved.songs[0].recordings, workspace.songs[0].recordings);
  assert.deepEqual(syncCatalog(saved).songs[0].recordings, saved.songs[0].recordings);
  const links = recordingLinks(saved.songs[0]);
  assert.equal(links.find(l => l.provider === "youtube").label, "Acoustic");
  assert.equal(links.find(l => l.provider === "spotify").exact, false);
  assert.equal(links.find(l => l.provider === "appleMusic").url, apple);
});

test("duplicate, malformed and oversized recording imports are rejected", () => {
  const r = { id: "link", provider: "spotify", label: " Album ", url: spotify, unexpected: "discard" };
  assert.deepEqual(validateRecordings([r]), [{id: "link", provider: "spotify", label: "Album", url: spotify}]);
  assert.throws(() => validateRecordings([r, {...r, id: "other", url: spotify + "?si=tracking"}]), /already saved/);
  assert.throws(() => validateRecordings([r, {...r, url: "https://open.spotify.com/track/1111111111111111111111"}]), /distinct/);
  assert.throws(() => validateRecordings([{...r, label: "x".repeat(301)}]), /300/);
  assert.throws(() => validateRecordings(Array(31).fill(r)), /30/);
});

test("metadata defaults preserve personal choices, removals, assessments and plans through refresh and backup", () => {
  const entry = allCatalogSongs.find(s => catalogRecordings[s.id]);
  assert.ok(entry, "Live metadata lookup populated catalog links");
  const original = { version: 1, profile: defaultProfile, songs: [structuredClone(entry)], libraries: [{ id: "mine", name: "Mine", songIds: [entry.id] }], plans: [] };
  const next = syncCatalog(original);
  const song = next.songs.find(s => s.id === entry.id);
  assert.deepEqual(song.recordings, catalogRecordings[entry.id]);
  assert.deepEqual(song.review, entry.review);
  assert.deepEqual(next.plans, original.plans);
  assert.deepEqual(next.libraries, original.libraries);
  for (const choices of [[], [{ id: "personal", provider: "youtube", label: "My preferred performance", url: youtube }], song.recordings.slice(1)]) {
    song.recordings = structuredClone(choices);
    const restored = syncCatalog(validateWorkspace(JSON.parse(JSON.stringify(next))));
    assert.deepEqual(restored.songs.find(s => s.id === entry.id).recordings, choices);
  }
  const edited = structuredClone(original);
  edited.songs[0].title = "Personal alternate song";
  assert.equal(syncCatalog(edited).songs[0].recordings, undefined);
});

test("catalog recordings use normalized real provider URLs and retained metadata evidence", async () => {
  const { readFile } = await import("node:fs/promises");
  const { evidence } = JSON.parse(await readFile(new URL("../data/recording-evidence.json", import.meta.url), "utf8"));
  for (const [id, links] of Object.entries(catalogRecordings)) {
    assert.ok(allCatalogSongs.some(s => s.id === id));
    assert.deepEqual(validateRecordings(links), links);
    for (const link of links) {
      const source = evidence[id].find(e => e.url === link.url);
      assert.ok(source);
      assert.equal(new URL(source.source).hostname, "itunes.apple.com");
      assert.ok(source.fetchedAt);
    }
  }
});
