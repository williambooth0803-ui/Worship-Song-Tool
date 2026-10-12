import assert from "node:assert/strict";
import { catalogSongs } from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";
import { filterIndex, indexCSV, indexFields } from "../public/song-index.js";

// Synthetic records verify the index at the planned 1,000-song size; they are
// never published as real catalog songs or counted as actual assessments.
const songs = Array.from({ length: 1000 }, (_, i) => {
  const song = structuredClone(catalogSongs[i % catalogSongs.length]);
  return {
    ...song,
    id: `scale-${i}`,
    title: `Fixture song ${i}`,
    metadata: {
      lyrics: `Unique token${i}\nWe just sing truth\nOh oh\nWe just sing truth`,
    },
  };
});
const plans = songs.map((song, i) => ({
  id: `plan-${i}`,
  date: "2026-10-11",
  status: i % 2 ? "draft" : "completed",
  items: [{ type: "song", songId: song.id }],
}));
const start = performance.now();
const matches = filterIndex(
  songs,
  {
    rules: [
      { field: "completedServices", op: "gte", value: 1 },
      { field: "interiorJust", op: "numeric", value: 2 },
    ],
    sort: "title",
  },
  defaultProfile,
  [],
  plans,
);
assert.equal(matches.length, 500);
const one = filterIndex(
  songs,
  { query: "token999" },
  defaultProfile,
  [],
  plans,
);
assert.equal(one.length, 1);
assert.equal(one[0].id, "scale-999");
assert.ok(
  indexCSV(matches, indexFields(songs), defaultProfile, [], plans).includes(
    "Last recorded use",
  ),
);
const duration = performance.now() - start;
assert.ok(
  duration < 10000,
  "1,000-song indexing should complete within a generous regression limit",
);
console.log(
  `PASS: 1,000 synthetic songs and 1,000 plans; combined history/text filters, unique full-text lookup and CSV in ${Math.round(duration)} ms.`,
);
