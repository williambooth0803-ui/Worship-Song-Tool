import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkspace } from "../public/backup.js";
import { defaultProfile } from "../public/core.js";
import { seedSongs } from "../public/seeds.js";

function workspace() {
  return structuredClone({
    version: 1,
    songs: seedSongs,
    profile: defaultProfile,
    libraries: [
      { id: "personal", name: "My repertoire", songIds: ["amazing-grace"] },
    ],
    plans: [
      {
        id: "sunday",
        title: "Sunday worship",
        date: "2026-10-18",
        theme: "Grace",
        passage: "Ephesians 2",
        items: [
          {
            id: "song-1",
            type: "song",
            songId: "amazing-grace",
            minutes: 4,
            role: "Response",
            notes: "Use three verses",
            key: "D",
          },
        ],
      },
    ],
  });
}
test("exported song notes, libraries, plans and profile survive restore", () => {
  const input = workspace();
  input.songs[0].review.notes = "My personal teaching notes";
  const output = validateWorkspace(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(output, input);
  assert.notEqual(output.songs, input.songs);
});
test("previous assessments survive restore without unlimited history nesting", () => {
  const input = workspace();
  input.songs[0].review.previous = structuredClone(input.songs[0].review);
  assert.ok(validateWorkspace(input).songs[0].review.previous);
  input.songs[0].review.previous.previous = structuredClone(
    seedSongs[0].review,
  );
  assert.throws(() => validateWorkspace(input), /deeply nested/);
});
test("rejects dangling references and duplicate song IDs", () => {
  const library = workspace();
  library.libraries[0].songIds = ["missing"];
  assert.throws(() => validateWorkspace(library), /missing song/);
  const plan = workspace();
  plan.plans[0].items[0].songId = "missing";
  assert.throws(() => validateWorkspace(plan), /missing song/);
  const duplicate = workspace();
  duplicate.songs.push(duplicate.songs[0]);
  assert.throws(() => validateWorkspace(duplicate), /duplicate/);
});
test("rejects malformed ratings, durations, sources and profile", () => {
  for (const mutate of [
    (s) => {
      s.songs[0].review.scores.accuracy = 999;
    },
    (s) => {
      s.plans[0].items[0].minutes = "4";
    },
    (s) => {
      s.songs[0].review.sources[0].url = "javascript:alert(1)";
    },
    (s) => {
      s.profile.weights = { accuracy: 0, substance: 0, language: 0, time: 0 };
    },
    (s) => {
      s.version = 999;
    },
  ]) {
    const value = workspace();
    mutate(value);
    assert.throws(() => validateWorkspace(value));
  }
});
test("unknown imported properties do not enter application state", () => {
  const input = workspace();
  input.unexpected = "discard me";
  input.songs[0].unexpected = "discard me";
  const output = validateWorkspace(input);
  assert.equal(output.unexpected, undefined);
  assert.equal(output.songs[0].unexpected, undefined);
});
