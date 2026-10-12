import { selectedArrangement } from "./planning.js";
export function objectiveFacts(song) {
  const a = selectedArrangement(song), m = song.metadata || {}, r = song.review;
  return [
    ["author", "Artist / attribution", song.author],
    ["key", "Key", a?.key || r.key],
    ["tempo", "Tempo", a?.tempo ?? m.tempo, " BPM"],
    ["minutes", "Duration", a?.minutes ?? r.minutes, " min"],
    ["timeSignature", "Time signature", a?.timeSignature || m.timeSignature],
    ["range", "Vocal range", a?.lowNote && a?.highNote ? a.lowNote + "–" + a.highNote : m.range],
    ["tune", "Tune", m.tune], ["meter", "Meter", m.meter],
  ].filter(([, , value]) => value !== null && value !== undefined && value !== "")
    .map(([field, label, value, unit = ""]) => ({
      field, label, value: String(value) + unit,
      provenance: a && ["key", "tempo", "minutes", "timeSignature", "range"].includes(field) && a[field] ? null : song.facts?.[field] || (field === "minutes" && !a && ["ai", "unreviewed", "starter"].includes(r.status) ? { confidence: "guess", source: "Editable planning estimate; no recording duration verified." } : null),
    }));
}
