// Stored ratings are evidence judgments, not automated church-use decisions.
export const scoringLabels = {
  accuracy: "Doctrinal accuracy", substance: "Theological substance",
  language: "Language & craftsmanship", time: "Arrangement coherence",
};
export const scoringRubrics = {
  accuracy: "Compare explicit claims with your stated church convictions and cited Scripture in context. Distinguish contradiction from omission. A simple song need not cover every doctrine. Rate the text, not the artist's reputation.",
  substance: "Assess how specifically and coherently the song develops its subject. Identify concrete claims, images and relationships. Depth can be expressed in simple words; word count and theological vocabulary alone do not establish substance.",
  language: "Assess complete thoughts, clear referents, intelligible imagery, grammar and progression. Judge repetition by what it accomplishes. Do not penalize poetry, dialect or accessible vocabulary merely for style.",
  time: "Assess the chosen arrangement's progression, repeated sections, pauses and instrumental or wordless passages against its stated purpose. Long is not bad and short is not good. Without the actual arrangement or recording, leave this unassessed. Legacy time scores remain stored under this criterion.",
};
export const suggestedCriteria = [
  { label: "Congregational singability", rubric: "Use the exact melody, chosen key and congregation: range, tessitura, leaps, phrase length and rhythmic learnability. Do not infer musical difficulty from lyrics or genre." },
  { label: "Corporate participation", rubric: "Assess whether the documented version enables meaningful congregational participation, including teachability and shared expression. First-person singular can express a shared confession; it is not automatically inferior." },
  { label: "Emotional and pastoral honesty", rubric: "Compare the text with its stated purpose: truthful expression of joy, grief, doubt, repentance or hope without unsupported promises or pressure to display an emotion. Lament is not inferior to celebration." },
  { label: "Scriptural faithfulness", rubric: "Check identifiable quotations and allusions in context. Distinguish accurate paraphrase from misleading use. Do not reward the number of references or penalize a song for not being a Scripture paraphrase." },
];
export const scoreAnchors = [
  ["0–1", "Fundamental failure", "Evidence shows the criterion is almost entirely unmet; identify the concrete failure."],
  ["2–3", "Major weaknesses", "Several serious, demonstrated problems substantially obstruct the stated purpose."],
  ["4–5", "Mixed", "Meaningful strengths coexist with recurring problems that need explanation or adaptation."],
  ["6–7", "Sound", "The criterion is substantially met; identifiable limitations remain."],
  ["8–9", "Very strong", "Consistently meets the criterion with only minor, specific limitations."],
  ["10", "Exemplary for this criterion", "Fully meets the stated criterion on the evidence reviewed; no material weakness identified. Ten is allowed, not reserved for an impossible perfect song."],
];
export function ratingCriteria(profile = {}) {
  if (Array.isArray(profile.criteria)) return profile.criteria;
  return Object.entries(scoringLabels).map(([id, label]) => ({ id, label, rubric: scoringRubrics[id], active: true }));
}
export function activeCriteria(profile = {}) {
  return ratingCriteria(profile).filter(c => c.active && Number(profile.weights?.[c.id] ?? 1) > 0);
}
export function criterionScore(review, id) {
  return Object.hasOwn(scoringLabels, id) ? review.scores?.[id] : review.customScores?.[id];
}
export function validateCriteria(value) {
  if (!Array.isArray(value) || value.length > 20 || !value.length) throw new Error("Use 1–20 rating criteria.");
  const result = value.map(c => {
    if (!c || typeof c !== "object" || !/^(accuracy|substance|language|time|custom-[a-z0-9-]{1,80})$/.test(c.id) || typeof c.label !== "string" || !c.label.trim() || c.label.length > 100 || typeof c.rubric !== "string" || c.rubric.length > 2000 || typeof c.active !== "boolean") throw new Error("A criterion needs an ID, name, evidence rubric and active setting.");
    return { id: c.id, label: c.label.trim(), rubric: c.rubric.trim(), active: c.active };
  });
  if (new Set(result.map(c => c.id)).size !== result.length || new Set(result.map(c => c.label.toLowerCase())).size !== result.length) throw new Error("Criterion IDs and names must be distinct.");
  if (!result.some(c => c.active)) throw new Error("Keep at least one criterion active.");
  return result;
}
export function validateCustomScores(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 50) throw new Error("Invalid custom scores.");
  const result = {};
  for (const [id, score] of Object.entries(value)) {
    if (!/^custom-[a-z0-9-]{1,80}$/.test(id) || (score !== null && (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10))) throw new Error("Custom scores must use a criterion ID and null or 0–10.");
    result[id] = score;
  }
  return result;
}
