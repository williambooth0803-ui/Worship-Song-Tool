import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkspace } from "../public/backup.js";
import { validateIndexView } from "../public/index-views.js";
import { templateFromPlan, planFromTemplate } from "../public/plan-templates.js";
import { chatGPTCriteriaPrompt } from "../public/criteria.js";
import { seedSongs } from "../public/seeds.js";
import { defaultProfile } from "../public/core.js";
import { filterIndex } from "../public/song-index.js";
import { songUsage } from "../public/planning.js";

const savedView = () => ({
  id: "view-1", name: "Concrete language", query: "", sort: "title",
  descending: false, column: "custom:hymnal number",
  rules: [{ field: "summary", op: "contains", value: "Concrete evidence" }],
});
const plan = () => ({
  id: "plan-1", title: "Sunday", date: "2026-10-11", status: "completed",
  theme: "Grace", passage: "Ephesians 2:1–10",
  items: [{
    id: "item-1", type: "song", songId: seedSongs[0].id,
    role: "Response", notes: "Three verses", key: "D", minutes: 4,
    arrangementName: "Acoustic", arrangementId: "acoustic",
  }],
});
const workspace = () => ({
  version: 1, songs: structuredClone(seedSongs), profile: structuredClone(defaultProfile),
  libraries: [{ id: "mine", name: "My repertoire", songIds: [seedSongs[0].id] }],
  plans: [plan()],
});
test("saved views and service templates survive validated backup/account round trips", () => {
  const input = workspace();
  input.indexViews = [savedView()];
  input.planTemplates = [templateFromPlan(input.plans[0], "Sunday order")];
  const output = validateWorkspace(JSON.parse(JSON.stringify(input)));
  assert.deepEqual(output.indexViews, input.indexViews);
  assert.deepEqual(output.planTemplates, input.planTemplates);
  assert.equal(validateWorkspace(workspace()).indexViews, undefined);
  assert.equal(validateWorkspace(workspace()).planTemplates, undefined);
  output.planTemplates[0].items[0].notes = "Different";
  assert.equal(input.planTemplates[0].items[0].notes, "Three verses");
});
test("saved index views retain filters but cannot reveal hidden AI through a stored query", () => {
  const song = structuredClone(seedSongs[0]);
  song.review.status = "ai";
  song.review.summary = "Concrete evidence from a draft";
  song.catalogReview = structuredClone(song.review);
  const view = validateIndexView(savedView());
  assert.equal(filterIndex([song], view, { ...defaultProfile, aiMode: "full" }).length, 1);
  assert.equal(filterIndex([song], view, { ...defaultProfile, aiMode: "manual" }).length, 0);
  assert.equal(filterIndex([song], view, { ...defaultProfile, aiMode: "limited" }).length, 0);
  for (const changes of [
    { sort: "constructor" }, { descending: "false" },
    { rules: [{ field: "rating", op: "gte", value: "not a number" }] },
    { rules: [{ field: "title", op: "execute", value: "x" }] },
    { rules: Array(31).fill(savedView().rules[0]) },
  ]) assert.throws(() => validateIndexView({ ...savedView(), ...changes }), /Invalid saved/);
});
test("templates create independent undated drafts and optional manually filled song slots", () => {
  const original = plan();
  const template = templateFromPlan(original, "Sunday order");
  const created = planFromTemplate(template, { title: "Next Sunday", date: "2026-10-18" });
  assert.equal(template.date, "");
  assert.equal(template.status, "draft");
  assert.equal(created.status, "draft");
  assert.notEqual(created.id, template.id);
  assert.notEqual(created.items[0].id, template.items[0].id);
  assert.notEqual(template.items[0].id, original.items[0].id);
  created.items[0].notes = "Changed";
  assert.equal(original.items[0].notes, "Three verses");
  assert.equal(template.items[0].notes, "Three verses");
  assert.deepEqual(songUsage([], original.items[0].songId), { planned: 0, completed: 0, lastUsed: null });
  const orderOnly = templateFromPlan(original, "Order only", false);
  assert.equal(orderOnly.items[0].type, "other");
  assert.equal(orderOnly.items[0].songId, undefined);
  assert.equal(orderOnly.items[0].key, undefined);
  assert.equal(orderOnly.items[0].role, "Response");
  assert.throws(() => templateFromPlan(original, "  "), /template name/);
  const malformed = workspace();
  malformed.planTemplates = [original];
  assert.throws(() => validateWorkspace(malformed), /undated drafts/);
  malformed.planTemplates = [template];
  malformed.planTemplates[0].items[0].songId = "missing";
  assert.throws(() => validateWorkspace(malformed), /missing song/);
  const duplicates = workspace();
  duplicates.indexViews = [savedView(), savedView()];
  assert.throws(() => validateWorkspace(duplicates), /duplicate/);
});
test("ChatGPT criteria requests identify only the selected library and preserve human planning", () => {
  const library = { id: "mine", name: "My library", secret: "must not be copied", songIds: ["s"] };
  const prompt = chatGPTCriteriaPrompt(library, "Specific claims about God's faithfulness");
  assert.match(prompt, /Library ID: "mine"/);
  assert.match(prompt, /all pages/);
  assert.match(prompt, /insufficient evidence/);
  assert.match(prompt, /Do not suggest worship songs/);
  assert.match(prompt, /notes\/text permissions/);
  assert.ok(!prompt.includes("must not be copied"));
  assert.throws(() => chatGPTCriteriaPrompt(library, ""), /criterion/);
});
