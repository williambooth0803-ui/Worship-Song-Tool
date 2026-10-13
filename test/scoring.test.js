import test from "node:test";
import assert from "node:assert/strict";
import { overall, defaultProfile } from "../public/core.js";
import { ratingCriteria, validateCriteria } from "../public/scoring.js";
import { validateWorkspace } from "../public/backup.js";
import { syncCatalog } from "../public/catalog.js";
import { evaluationPrompt, parseEvaluation } from "../public/evaluation.js";
import { reviewForDisplay } from "../public/profile.js";

test("criteria toggles and removals change averages without changing stored scores", () => {
  const review = { scores: { accuracy: 2, substance: 6, language: 10, time: null }, customScores: { "custom-singability": 8 } };
  const criteria = ratingCriteria().map(c => ({ ...c, active: c.id === "language" }));
  criteria.push({ id: "custom-singability", label: "Singability", rubric: "Actual melody and chosen key", active: true });
  const profile = { ...defaultProfile, criteria, weights: { ...defaultProfile.weights, language: 1, "custom-singability": 1 } };
  assert.equal(overall(review, profile), 9);
  assert.equal(overall(review, { ...profile, criteria: criteria.filter(c => c.id !== "custom-singability") }), 10);
  assert.equal(review.customScores["custom-singability"], 8);
  assert.equal(overall({ scores: {} }, profile), null);
  assert.throws(() => validateCriteria(criteria.map(c => ({ ...c, active: false }))), /active/);
});
test("custom criteria and scores survive backups and refresh; AI scores stay hidden in human-only mode", () => {
  const workspace = syncCatalog({version:1,profile:defaultProfile,songs:[],libraries:[{id:"mine",name:"Mine",songIds:[]}],plans:[]});
  workspace.profile.criteria = [...ratingCriteria(), { id:"custom-singability", label:"Singability", rubric:"Measured melody", active:true }];
  workspace.profile.weights["custom-singability"] = 1;
  workspace.songs[0].review.customScores = {"custom-singability": 8};
  assert.equal(syncCatalog(validateWorkspace(workspace)).songs[0].review.customScores["custom-singability"],8);
  const s = workspace.songs[0]; s.review.status = "manual"; s.review.aiFields = ["scores"];
  assert.deepEqual(reviewForDisplay(s,"manual").customScores,{});
  const prompt = evaluationPrompt(s,{...workspace.profile,aiMode:"full"});
  assert.match(prompt,/custom-singability/); assert.match(prompt,/Ten is allowed/);
  const draft = {schema:"faithful-evaluation-v1",songId:s.id,aiMode:"full",review:{scores:{accuracy:null,substance:null,language:null,time:null},customScores:{"custom-singability":10},summary:"",claims:[],concerns:[],uses:[],scriptures:[],themes:[],language:"",time:"",concern:"none",sources:[]}};
  assert.equal(parseEvaluation(JSON.stringify(draft),s.id,"full").review.customScores["custom-singability"],10);
  draft.aiMode="limited"; assert.throws(()=>parseEvaluation(JSON.stringify(draft),s.id,"limited"),/Limited/);
});
