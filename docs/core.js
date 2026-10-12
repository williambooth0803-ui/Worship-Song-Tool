export const defaultProfile = {
  weights: { accuracy: 35, substance: 30, language: 20, time: 15 },
  principles:
    "Baptist convictions: Scripture as the doctrinal authority; the Trinity; Jesus Christ fully God and fully man; his atoning death and bodily resurrection; salvation by grace through faith, not earned by works or religious rites; believer’s baptism. Flag explicit claims of baptismal regeneration, worship of created beings, or guaranteed earthly health and wealth. Distinguish contradiction from omission and evaluate claims in context. Reformed soteriology is welcome. Do not penalize language about choosing to follow Christ on that basis alone. Value specific theological claims, clear English and well-structured sentences. Flag filler uses of “just”, extended wordless vocals, and unnecessary instrumental breaks. Distinguish poetic language from unclear syntax and evaluate repetition by purpose.",
};
export const dimensions = {
  accuracy: "Doctrinal accuracy",
  substance: "Theological substance",
  language: "Language & craftsmanship",
  time: "Purposeful use of time",
};
export function overall(review, profile = defaultProfile) {
  let total = 0,
    weight = 0;
  for (const key of Object.keys(dimensions)) {
    const value = review.scores?.[key],
      w = Number(profile.weights[key]);
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(Number(value)) ||
      w <= 0
    )
      continue;
    total += Number(value) * w;
    weight += w;
  }
  return weight ? Math.round((total / weight) * 10) / 10 : null;
}
export function recommendation(review, profile) {
  if (review.concern === "serious") return "Needs doctrinal review";
  const score = overall(review, profile);
  if (score === null) return "Awaiting assessment";
  const assessed = Object.keys(dimensions)
    .filter((k) => Number(profile.weights[k]) > 0)
    .every(
      (k) => review.scores?.[k] !== null && review.scores?.[k] !== undefined,
    );
  if (!assessed) return "Partial assessment";
  return score >= 8
    ? "Strong choice"
    : score >= 6
      ? "Useful with context"
      : "Needs review";
}
export function normalize(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function searchSongs(songs, query) {
  const terms = normalize(query).split(" ").filter(Boolean);
  const matches = songs.filter((s) =>
    terms.every((t) =>
      normalize(
        [s.title, s.author, s.firstLine, ...s.themes].join(" "),
      ).includes(t),
    ),
  );
  if (!terms.length) return matches;
  const phrase = terms.join(" ");
  const rank = (s) => {
    const title = normalize(s.title);
    if (title === phrase) return 1000;
    if (title.startsWith(phrase)) return 800;
    if (terms.every((term) => title.includes(term))) return 600;
    if (terms.every((term) => normalize(s.author).includes(term))) return 300;
    if (terms.every((term) => normalize(s.firstLine).includes(term))) return 200;
    return 100;
  };
  return matches.sort((a, b) => rank(b) - rank(a));
}
export function planDuration(items) {
  return items.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
}
export function validateReview(value) {
  if (!value || typeof value !== "object")
    throw new Error("The analysis did not return a review.");
  const scores = {};
  for (const key of Object.keys(dimensions)) {
    const score = value.scores?.[key];
    if (
      score !== null &&
      (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10)
    )
      throw new Error(`Invalid ${key} score.`);
    scores[key] = score;
  }
  const string = (v, max = 6000) =>
    typeof v === "string" ? v.slice(0, max) : "";
  const list = (v) =>
    Array.isArray(v)
      ? v
          .filter((x) => typeof x === "string")
          .slice(0, 20)
          .map((x) => x.slice(0, 1500))
      : [];
  return {
    scores,
    summary: string(value.summary),
    claims: list(value.claims),
    concerns: list(value.concerns),
    uses: list(value.uses),
    scriptures: list(value.scriptures),
    themes: list(value.themes),
    language: string(value.language),
    time: string(value.time),
    concern: ["none", "context", "serious"].includes(value.concern)
      ? value.concern
      : "context",
  };
}
