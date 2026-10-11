import test from "node:test";
import assert from "node:assert/strict";
import {
  composePrinciples,
  withProfileDefaults,
  restrictAssistance,
  reviewForDisplay,
  themesForDisplay,
} from "../public/profile.js";
import { defaultProfile } from "../public/core.js";
import { syncCatalog } from "../public/catalog.js";
import { validateWorkspace } from "../public/backup.js";
test("old profiles keep their convictions and default to full AI content", () => {
  const old = { ...defaultProfile, principles: "My custom church convictions" };
  const result = withProfileDefaults(old);
  assert.equal(result.principles, old.principles);
  assert.equal(result.aiMode, "full");
  assert.equal(result.setupComplete, false);
});
test("statement summaries produce different starting principles", () => {
  assert.match(composePrinciples("london1689"), /election/);
  assert.match(composePrinciples("augsburg"), /Lutheran/);
  assert.match(
    composePrinciples("custom", "Our church’s additional convictions"),
    /additional convictions/,
  );
});
test("limited assistance cannot retain theological scores or suggestions", () => {
  const review = {
    scores: { accuracy: 10, substance: 10, language: 10, time: 10 },
    claims: ["A theological assertion"],
    scriptures: ["A reference"],
    uses: ["Communion"],
    concerns: ["Claim"],
    themes: ["Election"],
    concern: "serious",
    language: "An observation",
    summary: "Observation",
    time: "An observation",
  };
  const limited = restrictAssistance(review, "limited");
  assert.deepEqual(limited.scores, {
    accuracy: null,
    substance: null,
    language: null,
    time: null,
  });
  assert.deepEqual(limited.claims, []);
  assert.deepEqual(limited.scriptures, []);
  assert.equal(limited.language, "An observation");
  assert.equal(restrictAssistance(review, "full"), review);
});
test("denomination, statement and AI choices survive validated backups", () => {
  const workspace = syncCatalog({
    version: 1,
    songs: [],
    libraries: [{ id: "me", name: "My songs", songIds: [] }],
    plans: [],
    profile: defaultProfile,
  });
  workspace.profile = {
    ...workspace.profile,
    denomination: "lutheran",
    statement: "augsburg",
    aiMode: "limited",
    setupComplete: true,
  };
  assert.deepEqual(validateWorkspace(workspace).profile, workspace.profile);
  workspace.profile.aiMode = "unknown";
  assert.throws(() => validateWorkspace(workspace), /aiMode/);
});
test("AI visibility is personal and hides draft content without deleting it", () => {
  const song = {
    themes: ["AI-added theme"],
    catalogThemes: ["Grace"],
    review: {
      status: "ai",
      summary: "AI draft",
      scores: { accuracy: 2, substance: 2, language: 2, time: 2 },
      notes: "Personal note",
      key: "D",
      minutes: 4,
      musical: "My arrangement notes",
      previous: {
        status: "manual",
        summary: "Human review",
        scores: { accuracy: 8, substance: 8, language: 8, time: null },
      },
      assistance: { summary: "An observation" },
    },
  };
  assert.equal(reviewForDisplay(song, "full").summary, "AI draft");
  assert.equal(reviewForDisplay(song, "manual").summary, "Human review");
  assert.equal(reviewForDisplay(song, "manual").assistance, undefined);
  assert.equal(
    reviewForDisplay(song, "limited").assistance.summary,
    "An observation",
  );
  assert.equal(reviewForDisplay(song, "manual").notes, "Personal note");
  assert.deepEqual(themesForDisplay(song, "manual"), ["Grace"]);
  assert.equal(song.review.summary, "AI draft");
});
