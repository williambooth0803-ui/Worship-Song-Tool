import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluationSnapshot,
  evaluationToken,
  workspaceEvaluationPrompt,
  parseWorkspaceEvaluation,
  evaluationCharts,
} from "../public/workspace-evaluation.js";

const workspace = () => ({
  profile: { aiMode: "full", privateContext: "PRIVATE ACCOUNT" },
  songs: [
    {
      id: "a",
      title: "One",
      author: "Artist",
      version: "Album",
      review: { notes: "PRIVATE REVIEW" },
      metadata: { tempo: 70, lyrics: "OPTED WORDS" },
      preferredArrangementId: "slow",
      arrangements: [
        { id: "slow", tempo: 70, lowNote: "C3", highNote: "G4" },
        { id: "fast", tempo: 130, lowNote: "D3", highNote: "A4" },
      ],
    },
    { id: "b", title: "Two", author: "Other" },
    {
      id: "hidden",
      title: "BLACKLIST TITLE",
      blacklisted: true,
      metadata: { lyrics: "BLACKLIST WORDS" },
    },
  ],
  libraries: [
    { id: "l1", name: "First", songIds: ["a", "hidden", "a"] },
    { id: "l2", name: "Second", songIds: ["a", "b"] },
    { id: "unselected", name: "PRIVATE LIBRARY", songIds: ["b"] },
  ],
  plans: [
    {
      id: "p1",
      title: "Morning",
      theme: "Hope",
      passage: "Psalm 46",
      items: [
        {
          id: "heading",
          type: "heading",
          title: "Gathering",
          minutes: 0,
          notes: "PRIVATE HEADING",
        },
        {
          id: "i1",
          type: "song",
          songId: "a",
          minutes: 4,
          key: "D",
          arrangementId: "fast",
          notes: "PRIVATE ITEM",
        },
        { id: "i2", type: "song", songId: "a", minutes: 2, key: "C" },
        {
          id: "i3",
          type: "song",
          songId: "hidden",
          title: "BLACKLIST ITEM",
          minutes: 3,
        },
        { id: "i4", type: "reading", title: "Psalm 46", minutes: 2 },
      ],
    },
    {
      id: "p2",
      title: "Evening",
      items: [{ id: "other", type: "song", songId: "b", minutes: 5 }],
    },
    { id: "unselected", title: "PRIVATE PLAN", items: [] },
  ],
});
const options = () => ({
  planIds: ["p1", "p2"],
  libraryIds: ["l1", "l2"],
  criteria: ["direction", "trinity", "tempo", "participation"],
  custom: ["What is evidenced about confession?"],
  purpose: "Understand lament coverage",
});
const response = (snapshot) => ({
  schema: "faithful-workspace-evaluation-v1",
  requestId: "request",
  summary: "Some evidence is missing.",
  strengths: ["Recorded tempos"],
  weaknesses: [],
  limitations: ["Lyrics unavailable"],
  songs: snapshot.songs.map((s) => ({
    id: s.id,
    direction: s.id === "a" ? "toGod" : "unknown",
    trinity: s.id === "a" ? ["father", "son"] : ["unknown"],
    evidence: s.id === "a" ? "Verified short text" : "Text unavailable",
    sources: [],
  })),
  criteria: snapshot.criteria.map((c) => ({
    id: c.id,
    findings: snapshot.scopes.map((scope) => ({
      scopeId: scope.id,
      observation: "Evidence limited.",
      evidenceSongIds: [],
    })),
    coverage: {
      status:
        snapshot.scopes.some((s) => s.type === "plan") &&
        snapshot.scopes.some((s) => s.type === "library")
          ? "unknown"
          : "notApplicable",
      explanation: "Insufficient text evidence.",
    },
  })),
});

test("mixed evaluation shares only selected evidence and explicit words, preserving the workspace", () => {
  const w = workspace(),
    before = structuredClone(w),
    snapshot = evaluationSnapshot(w, options()),
    prompt = workspaceEvaluationPrompt(w, options(), "request");
  for (const text of [
    "PRIVATE ACCOUNT",
    "PRIVATE REVIEW",
    "PRIVATE HEADING",
    "PRIVATE ITEM",
    "PRIVATE LIBRARY",
    "PRIVATE PLAN",
    "BLACKLIST TITLE",
    "BLACKLIST ITEM",
    "BLACKLIST WORDS",
    "OPTED WORDS",
  ])
    assert.ok(!prompt.includes(text), text);
  assert.ok(
    workspaceEvaluationPrompt(
      w,
      { ...options(), includeWords: true },
      "request",
    ).includes("OPTED WORDS"),
  );
  assert.equal(snapshot.songs.length, 2);
  assert.deepEqual(snapshot.scopes[0].songIds, ["a"]);
  assert.equal(
    snapshot.scopes.find((s) => s.id === "plan:p1").items[3].unavailable,
    true,
  );
  assert.match(prompt, /Do not recommend, nominate or rank songs/);
  assert.match(prompt, /union/);
  assert.match(prompt, /no universal equal-proportion ideal/);
  assert.deepEqual(w, before);
});
test("scope charts retain plan occurrences, missing songs and actual arrangements; library union deduplicates", () => {
  const snapshot = evaluationSnapshot(workspace(), options()),
    report = parseWorkspaceEvaluation(
      JSON.stringify(response(snapshot)),
      snapshot,
      "request",
    ),
    charts = evaluationCharts(report, snapshot),
    plan = charts.find((c) => c.id === "plan:p1"),
    union = charts.find((c) => c.id === "library-union");
  assert.equal(plan.total, 3);
  assert.equal(plan.minutes, 11);
  assert.equal(plan.charts.find((c) => c.id === "direction").counts.toGod, 2);
  assert.equal(plan.charts.find((c) => c.id === "direction").counts.unknown, 1);
  assert.equal(plan.charts.find((c) => c.id === "tempo").counts["120+ BPM"], 1);
  assert.equal(
    plan.charts.find((c) => c.id === "tempo").counts["Below 80 BPM"],
    1,
  );
  assert.equal(plan.charts.find((c) => c.id === "tempo").counts.unknown, 1);
  assert.equal(plan.charts.find((c) => c.id === "trinity").counts.father, 2);
  assert.equal(plan.charts.find((c) => c.id === "trinity").counts.son, 2);
  assert.equal(union.total, 2);
  assert.equal(union.charts.find((c) => c.id === "direction").counts.toGod, 1);
  assert.equal(charts.find((c) => c.id === "plan-combined").total, 4);
  assert.equal(charts.find((c) => c.id === "plan-combined").minutes, 16);
});
test("staleness binds scope membership, words opt-in, order, measures, keys, purpose and criteria", () => {
  const w = workspace(),
    config = options(),
    token = evaluationToken(w, config);
  for (const change of [
    (w) => w.plans[0].items.reverse(),
    (w) => (w.plans[0].items[1].key = "E"),
    (w) => (w.songs[0].arrangements[1].tempo = 100),
    (w) => w.libraries[0].songIds.push("b"),
  ]) {
    const next = structuredClone(w);
    change(next);
    assert.notEqual(evaluationToken(next, config), token);
  }
  assert.notEqual(evaluationToken(w, { ...config, purpose: "Other" }), token);
  assert.notEqual(
    evaluationToken(w, { ...config, criteria: ["tempo"] }),
    token,
  );
  assert.notEqual(evaluationToken(w, { ...config, includeWords: true }), token);
  w.plans[2].title = "OTHER PRIVATE PLAN";
  w.songs[0].review.notes = "Unshared note";
  assert.equal(
    evaluationToken(w, config),
    token,
    "unshared data does not leak into the binding",
  );
});
test("criteria and scope validation support custom-only and non-song/empty scopes without AI inventions", () => {
  const w = workspace();
  const config = {
    planIds: ["unselected"],
    libraryIds: [],
    criteria: [],
    custom: ["Observe my existing readings"],
  };
  const snapshot = evaluationSnapshot(w, config);
  assert.equal(snapshot.songs.length, 0);
  const r = response(snapshot);
  const parsed = parseWorkspaceEvaluation(
    JSON.stringify(r),
    snapshot,
    "request",
  );
  assert.equal(evaluationCharts(parsed, snapshot)[0].total, 0);
  assert.throws(
    () => evaluationSnapshot(w, { ...config, custom: [] }),
    /at least one criterion/,
  );
  assert.throws(
    () =>
      evaluationSnapshot(w, { ...config, custom: Array(7).fill("Question") }),
    /six/,
  );
  assert.throws(
    () => evaluationSnapshot(w, { ...config, planIds: ["missing"] }),
    /no longer/,
  );
  assert.throws(
    () => evaluationSnapshot(w, { ...config, planIds: [] }),
    /at least one existing/,
  );
  w.profile.aiMode = "manual";
  assert.throws(
    () => workspaceEvaluationPrompt(w, config, "request"),
    /Full AI/,
  );
});
test("parser rejects wrong requests, recommendations, scores, edits and unsupported criterion/scope IDs", () => {
  const snapshot = evaluationSnapshot(workspace(), options()),
    parse = (r) =>
      parseWorkspaceEvaluation(JSON.stringify(r), snapshot, "request");
  for (const mutate of [
    (r) => (r.recommendations = ["a"]),
    (r) => (r.songs[0].scores = { value: 10 }),
    (r) => (r.criteria[0].findings[0].edits = []),
    (r) => (r.criteria[0].id = "invented"),
    (r) => (r.criteria[0].findings[0].scopeId = "plan:unselected"),
    (r) => (r.requestId = "older"),
  ]) {
    const r = response(snapshot);
    mutate(r);
    assert.throws(() => parse(r));
  }
  const before = structuredClone(snapshot);
  parse(response(snapshot));
  assert.deepEqual(snapshot, before);
});
test("parser requires complete evidence, valid categories, safe sources and exact scope membership", () => {
  const snapshot = evaluationSnapshot(workspace(), options()),
    parse = (r) =>
      parseWorkspaceEvaluation(JSON.stringify(r), snapshot, "request");
  for (const mutate of [
    (r) => r.songs.pop(),
    (r) => (r.songs[1].id = "a"),
    (r) => (r.songs[0].trinity = ["unknown", "son"]),
    (r) => (r.songs[0].direction = "invented"),
    (r) => (r.songs[0].evidence = ""),
    (r) => r.criteria.pop(),
    (r) => r.criteria[0].findings.pop(),
    (r) => (r.criteria[0].findings[0].evidenceSongIds = ["b"]),
    (r) => (r.criteria[0].coverage.status = "ideal"),
    (r) =>
      (r.criteria[0].findings[1].scopeId = r.criteria[0].findings[0].scopeId),
  ]) {
    const r = response(snapshot);
    mutate(r);
    assert.throws(() => parse(r));
  }
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
    "https://127.0.0.1/test",
    "https://localhost/test",
    "https://[::1]/test",
    "https://private.internal/test",
  ]) {
    const r = response(snapshot);
    r.songs[0].sources = [{ url, label: "Source" }];
    assert.throws(() => parse(r), /HTTPS/);
  }
  const r = response(snapshot);
  r.songs[0].sources = [{ url: "https://example.com/text", label: "Text" }];
  assert.equal(parse(r).songs[0].sources.length, 1);
});
