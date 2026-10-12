import test from "node:test";
import assert from "node:assert/strict";
import { searchSongs } from "../public/core.js";
import { closestSongs } from "../public/fuzzy-search.js";
import { songResourceLinks } from "../public/song-resources.js";
import { allCatalogSongs, catalogSongs, syncCatalog } from "../public/catalog.js";
import { validateWorkspace } from "../public/backup.js";
import { defaultProfile } from "../public/core.js";

test("title lookup ranks exact and partial titles before authors, themes and first lines", () => {
  const songs = [
    { id: "theme", title: "Other", author: "Someone", firstLine: "", themes: ["Christ Be Magnified"] },
    { id: "author", title: "Another", author: "Christ Be Magnified", firstLine: "", themes: [] },
    { id: "long", title: "Christ Be Magnified (Live)", author: "Cody", firstLine: "", themes: [] },
    { id: "exact", title: "Christ Be Magnified", author: "Cody", firstLine: "", themes: [] },
  ];
  assert.deepEqual(searchSongs(songs, "Christ be magnified").map(s => s.id), ["exact", "long", "author", "theme"]);
  assert.deepEqual(songs.map(s => s.id), ["theme", "author", "long", "exact"]);
});
test("closest lookup handles spelling errors, transpositions, missing spaces and recording artists", () => {
  for (const [query, title] of [["christ be magnifed", "Christ Be Magnified"], ["goodbye yesterdya", "Goodbye Yesterday"], ["washed", "Washed"], ["goodplans", "Good Plans"], ["known by yu", "Known by You"]]) {
    assert.equal(closestSongs(allCatalogSongs, query)[0].title, title);
  }
  assert.ok(closestSongs(allCatalogSongs, "elevaton rhythm").some(s => s.author.includes("Elevation RHYTHM")));
  assert.ok(!closestSongs(allCatalogSongs, "christ be magnifed").some(s => s.title === "Christ Is Risen"));
  assert.deepEqual(closestSongs(allCatalogSongs, "qzxv qzxv qzxv"), []);
  assert.deepEqual(closestSongs(allCatalogSongs, "a"), []);
  assert.deepEqual(closestSongs(allCatalogSongs, ""), []);
});
test("title alternatives stay in their pool and never rank by ratings", () => {
  const songs = [{ id: "a", title: "Good Plans", author: "Red Rocks Worship", review: { scores: { accuracy: 1 } } }, { id: "b", title: "Good Plan", author: "Someone", review: { scores: { accuracy: 10 } } }];
  const before = structuredClone(songs);
  assert.equal(closestSongs(songs, "good plnas")[0].id, "a");
  assert.deepEqual(songs, before);
  assert.ok(closestSongs([songs[1]], "good plnas").every(s => s.id === "b"));
});
test("expanded catalog includes user-confirmed recordings and preserves old personal data", () => {
  const pairs = [["Christ Be Magnified", "Cody Carnes"], ["Goodbye Yesterday", "Elevation RHYTHM"], ["Washed", "Elevation RHYTHM"], ["At the Altar", "Elevation RHYTHM"], ["Known by You", "Elevation RHYTHM"], ["Good Plans", "Red Rocks Worship"]];
  for (const [title, artist] of pairs) {
    assert.ok(allCatalogSongs.some(s => s.title === title && s.author.endsWith(artist)));
    assert.ok(catalogSongs.some(s => s.title === title && s.author.endsWith(artist)));
  }
  const old = syncCatalog({ version: 1, profile: defaultProfile, songs: [], libraries: [{ id: "mine", name: "My songs", songIds: [] }], plans: [] });
  old.songs[0].review.status = "manual"; old.songs[0].review.notes = "Keep my evaluation";
  const next = syncCatalog(old);
  assert.equal(next.songs[0].review.notes, "Keep my evaluation");
  assert.deepEqual(next.libraries, old.libraries);
  assert.deepEqual(syncCatalog(next), next);
  assert.deepEqual(validateWorkspace(next), next);
  for (const category of ["traditional", "modern", "worship", "ccm", "gospel"]) assert.ok(allCatalogSongs.filter(s => s.category === category).length >= 100);
});
test("resource search links bind the title and recording without pretending a review page exists", () => {
  const links = songResourceLinks({ title: "Forever (We Sing Hallelujah)", author: "Associated recording: Kari Jobe" });
  assert.equal(new URL(links.lyrics).searchParams.get("q"), '"Forever" Kari Jobe lyrics');
  assert.equal(new URL(links.reviews).searchParams.get("q"), '"Forever" Kari Jobe worship song theological review');
});
