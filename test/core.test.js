import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultProfile,
  overall,
  recommendation,
  searchSongs,
  planDuration,
  validateReview,
} from "../public/core.js";
import { seedSongs } from "../public/seeds.js";

test("unknown dimensions are excluded rather than counted as zero", () => {
  const review = {
    scores: { accuracy: 9, substance: 9, language: 8, time: null },
    concern: "none",
  };
  assert.equal(overall(review), 8.8);
  assert.equal(recommendation(review, defaultProfile), "Partial assessment");
  assert.equal(overall({ scores: {} }), null);
});
test("serious doctrinal concerns cannot be averaged away", () => {
  const review = {
    scores: { accuracy: 10, substance: 10, language: 10, time: 10 },
    concern: "serious",
  };
  assert.equal(
    recommendation(review, defaultProfile),
    "Needs doctrinal review",
  );
});
test("custom weights change the outcome and a zero-weight dimension is excluded", () => {
  const review = {
    scores: { accuracy: 9, substance: 2, language: null, time: null },
  };
  const profile = {
    weights: { accuracy: 100, substance: 0, language: 0, time: 0 },
  };
  assert.equal(overall(review, profile), 9);
  assert.equal(recommendation(review, profile), "Strong choice");
});
test("title, writer, opening line and themes help identify the exact song", () => {
  assert.equal(searchSongs(seedSongs, "AMAZING grace")[0].id, "amazing-grace");
  assert.equal(
    searchSongs(seedSongs, "Newton salvation")[0].id,
    "amazing-grace",
  );
  assert.equal(searchSongs(seedSongs, "Lord of my heart")[0].id, "be-thou");
  assert.equal(searchSongs(seedSongs, "unknown title").length, 0);
});
test("planning durations include songs and other service items", () => {
  assert.equal(
    planDuration([{ minutes: 4.5 }, { minutes: 3 }, { minutes: 25 }]),
    32.5,
  );
});
test("AI review validation rejects fabricated score shapes", () => {
  assert.throws(() => validateReview({ scores: { accuracy: 15 } }));
  assert.throws(() => validateReview({ scores: { accuracy: "9" } }));
  const result = validateReview({
    scores: { accuracy: null, substance: 8, language: 7, time: null },
    claims: ["Grace saves sinners.", { unsafe: true }],
    concern: "invalid",
  });
  assert.deepEqual(result.claims, ["Grace saves sinners."]);
  assert.equal(result.concern, "context");
});
test("starter notes do not claim an arrangement assessment", () => {
  for (const song of seedSongs) {
    assert.equal(song.review.scores.time, null);
    assert.match(song.review.musical, /^Not assessed/);
  }
});
