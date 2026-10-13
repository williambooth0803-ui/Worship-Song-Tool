export const detailAttributes = {
  rating: "Rating",
  key: "Preferred key",
  duration: "Planning estimate",
  recordings: "Recordings",
  summary: "Assessment",
  claims: "Claims",
  uses: "Service uses",
  themes: "Themes",
  scriptures: "Scripture",
  language: "Language",
  time: "Meaningful time",
  musical: "Musical notes",
  arrangements: "Arrangements",
  text: "Word index",
  usage: "Service history",
  notes: "Your notes",
  concerns: "Concerns",
  sources: "Sources",
};
export const defaultOrder = Object.keys(detailAttributes);
export function attributeOrder(song) {
  return [
    ...new Set([
      ...(song.detailLayout?.order || []),
      ...defaultOrder,
      ...(song.metadata?.custom || []).map((x) => "custom:" + x.name),
    ]),
  ];
}
export function isAiField(song, review, field) {
  if (["notes", "musical", "key", "minutes"].includes(field)) return false;
  if (field === "themes" && song.metadata?.themes) return false;
  return Array.isArray(review.aiFields)
    ? review.aiFields.includes(field)
    : review.status === "ai" &&
        [
          "scores",
          "summary",
          "claims",
          "uses",
          "scriptures",
          "language",
          "time",
          "concerns",
          "themes",
        ].includes(field);
}
export function significant(value) {
  return (
    typeof value === "string" &&
    Boolean(value.trim()) &&
    !/^not assessed\b|^language not assessed|^arrangement not assessed/i.test(
      value.trim(),
    )
  );
}
export function specificScriptures(values) {
  return (values || []).filter(
    (x) =>
      !/thematic|imagery connection|thematic foundation/i.test(x) &&
      /\b\d{1,3}:\d{1,3}\b/.test(x),
  );
}
