import { overall, dimensions } from "./core.js";
import { reviewForDisplay, themesForDisplay } from "./profile.js";
import { approvalLabels } from "./catalog.js";
import { songTypes } from "./repertoire-data.js";
import {
  selectedArrangement,
  rangeSpan,
  songUsage,
  buildUsageIndex,
} from "./planning.js";
import { textStats } from "./text-stats.js";

// Key-aware text normalization: C# and C must remain different values.
export const indexText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/\s+/g, " ")
    .trim();
export function indexFields(songs) {
  const fields = [
    ["title", "Title"],
    ["author", "Attribution"],
    ["category", "Song type"],
    ["arrangements", "Arrangement names"],
    ["arrangementKeys", "All arrangement keys"],
    ["selectedArrangement", "Preferred arrangement"],
    ["rangeSpan", "Vocal span (semitones)", "number"],
    ["largestLeap", "Largest vocal jump (semitones)", "number"],
    ["wordlessSeconds", "Wordless vocals (seconds)", "number"],
    ["instrumentalSeconds", "Instrumentals (seconds)", "number"],
    ["plannedServices", "Saved service plans", "number"],
    ["completedServices", "Completed services", "number"],
    ["lastUsedDate", "Last recorded use"],
    ["firstLine", "Opening line"],
    ["lyrics", "Song words"],
    ["wordCount", "Stored word count", "number"],
    ["uniqueWords", "Unique stored words", "number"],
    ["justCount", "Occurrences of “just”", "number"],
    ["interiorJust", "Interior “just” occurrences", "number"],
    ["ohCount", "Occurrences of “oh”", "number"],
    ["repeatedLines", "Repeated stored lines", "number"],
    ["textCoverage", "Text coverage"],
    ["themes", "Themes"],
    ["key", "Preferred key"],
    ["tune", "Tune"],
    ["meter", "Poetic meter"],
    ["tempo", "Tempo (BPM)", "number"],
    ["timeSignature", "Time signature"],
    ["range", "Vocal range"],
    ["vocalDifficulty", "Vocal difficulty"],
    ["instrumentalDifficulty", "Instrumental difficulty"],
    ["instruments", "Instruments"],
    ["tags", "Your tags"],
    ["languageName", "Language"],
    ["scriptures", "Scripture references"],
    ["uses", "Recorded use cases"],
    ["musical", "Musical observations"],
    ["minutes", "Planning duration (min)", "number"],
    ["rating", "Overall rating", "number"],
    ...Object.entries(dimensions).map(([id, label]) => [id, label, "number"]),
    ["status", "Assessment source"],
    ["concern", "Doctrinal concern"],
    ["approval", "Church-use decision"],
    ["notes", "Your notes"],
    ["summary", "Assessment summary"],
    ["claims", "Theological claims"],
    ["concerns", "Assessment concerns"],
    ["language", "Language observations"],
    ["time", "Use-of-time observations"],
    ["libraries", "Libraries"],
    ["version", "Version / arrangement"],
  ].map(([id, label, type = "text"]) => ({ id, label, type }));
  const custom = new Map();
  for (const song of songs)
    for (const item of song.metadata?.custom || []) {
      const id = `custom:${indexText(item.name)}`;
      const prior = custom.get(id);
      custom.set(id, {
        id,
        label: item.name,
        type: prior && prior.type !== item.type ? "text" : item.type,
      });
    }
  return [
    ...fields,
    ...[...custom.values()].sort((a, b) => a.label.localeCompare(b.label)),
  ];
}
export function indexedValue(song, field, profile, libraries = [], plans = []) {
  const review = reviewForDisplay(song, profile.aiMode);
  if (
    [
      "wordCount",
      "uniqueWords",
      "justCount",
      "interiorJust",
      "ohCount",
      "repeatedLines",
    ].includes(field)
  )
    return textStats(song)[field];
  const arrangement = selectedArrangement(song);
  if (field === "category") return songTypes[song.category || "other"];
  if (field === "arrangements")
    return (song.arrangements || []).map((a) => a.name);
  if (field === "arrangementKeys")
    return (song.arrangements || []).map((a) => a.key).filter(Boolean);
  if (field === "selectedArrangement") return arrangement?.name || null;
  if (field === "rangeSpan") return rangeSpan(arrangement);
  if (["largestLeap", "wordlessSeconds", "instrumentalSeconds"].includes(field))
    return arrangement?.[field] ?? null;
  if (
    ["plannedServices", "completedServices", "lastUsedDate"].includes(field)
  ) {
    const usage = songUsage(plans, song.id);
    return {
      plannedServices: usage.planned,
      completedServices: usage.completed,
      lastUsedDate: usage.lastUsed,
    }[field];
  }
  if (
    arrangement &&
    [
      "key",
      "minutes",
      "tempo",
      "timeSignature",
      "vocalDifficulty",
      "instrumentalDifficulty",
      "instruments",
    ].includes(field)
  )
    return arrangement[field];
  if (arrangement && field === "range")
    return arrangement.lowNote && arrangement.highNote
      ? `${arrangement.lowNote}–${arrangement.highNote}`
      : null;
  if (field.startsWith("custom:"))
    return (
      song.metadata?.custom?.find(
        (item) => `custom:${indexText(item.name)}` === field,
      )?.value ?? null
    );
  if (field === "themes") return themesForDisplay(song, profile.aiMode);
  if (field === "lyrics") return song.metadata?.lyrics || song.firstLine || "";
  if (field === "textCoverage")
    return song.metadata?.lyrics
      ? "Stored text"
      : song.firstLine
        ? "Opening line only"
        : "No text recorded";
  if (field === "rating") return overall(review, profile);
  if (field in dimensions) return review.scores[field];
  if (field === "approval")
    return approvalLabels[song.approval?.status || "unreviewed"];
  if (field === "status")
    return {
      starter: "Editorial starter assessment",
      manual: "Your assessment",
      ai: "AI draft",
      unreviewed: "Awaiting assessment",
    }[review.status];
  if (field === "concern")
    return {
      none: "No identified concern",
      context: "Context needed",
      serious: "Serious concern",
    }[review.concern];
  if (field === "libraries")
    return libraries
      .filter((l) => l.songIds.includes(song.id))
      .map((l) => l.name);
  if (field in song) return song[field];
  if (field in review) return review[field];
  return song.metadata?.[field] ?? null;
}
export function indexEntries(
  songs,
  field,
  profile,
  libraries = [],
  plans = [],
) {
  plans = buildUsageIndex(plans);
  const entries = new Map();
  for (const song of songs) {
    const value = indexedValue(
      song,
      field === "words" ? "lyrics" : field,
      profile,
      libraries,
      plans,
    );
    const values =
      field === "words"
        ? (
            indexText(value).match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []
          ).map((w) => w.replace(/’/g, "'"))
        : Array.isArray(value)
          ? value
          : [value];
    const perSong = new Set();
    for (const item of values) {
      if (item === null || item === undefined || String(item).trim() === "")
        continue;
      const key = indexText(item);
      if (perSong.has(key)) continue;
      perSong.add(key);
      const entry = entries.get(key) || { value: item, count: 0 };
      entry.count++;
      entries.set(key, entry);
    }
  }
  return [...entries.values()].sort((a, b) =>
    String(a.value).localeCompare(String(b.value), undefined, {
      numeric: true,
    }),
  );
}
export function matchesIndexRule(value, rule) {
  const values = Array.isArray(value) ? value : [value];
  const present = values.some(
    (v) => v !== null && v !== undefined && String(v).trim() !== "",
  );
  if (rule.op === "missing") return !present;
  if (rule.op === "present") return present;
  if (!present) return false;
  if (["gte", "lte", "numeric"].includes(rule.op)) {
    const target = Number(rule.value);
    if (String(rule.value).trim() === "" || !Number.isFinite(target))
      return false;
    return values.some(
      (v) =>
        typeof v === "number" &&
        Number.isFinite(v) &&
        (rule.op === "gte"
          ? v >= target
          : rule.op === "lte"
            ? v <= target
            : v === target),
    );
  }
  const target = indexText(rule.value);
  if (!target) return false;
  const match = values.some((v) => {
    const text = indexText(v);
    if (rule.op === "equals") return text === target;
    if (rule.op === "word") {
      const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || [];
      return (
        words.includes(target.replace(/’/g, "'")) ||
        words
          .map((w) => w.replace(/’/g, "'"))
          .includes(target.replace(/’/g, "'"))
      );
    }
    return text.includes(target);
  });
  return rule.op === "excludes" ? !match : match;
}
export function filterIndex(
  songs,
  { query = "", rules = [], sort = "title", descending = false } = {},
  profile,
  libraries = [],
  plans = [],
) {
  plans = buildUsageIndex(plans);
  const fields = indexFields(songs),
    terms = indexText(query).split(" ").filter(Boolean),
    values = new Map();
  const valueFor = (song, field) => {
    let row = values.get(song.id);
    if (!row) {
      row = new Map();
      values.set(song.id, row);
    }
    if (!row.has(field))
      row.set(field, indexedValue(song, field, profile, libraries, plans));
    return row.get(field);
  };
  const result = songs.filter((song) => {
    if (
      !rules.every((rule) => matchesIndexRule(valueFor(song, rule.field), rule))
    )
      return false;
    if (!terms.length) return true;
    const text = indexText(
      fields
        .map((f) => {
          const value = valueFor(song, f.id);
          return Array.isArray(value) ? value.join(" ") : (value ?? "");
        })
        .join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
  const numeric = fields.find((f) => f.id === sort)?.type === "number";
  return result.sort((a, b) => {
    const av = valueFor(a, sort),
      bv = valueFor(b, sort),
      missing = (v) => v === null || v === undefined || v === "";
    if (missing(av) !== missing(bv)) return missing(av) ? 1 : -1;
    const compared = numeric
      ? (Number(av) || 0) - (Number(bv) || 0)
      : String(av ?? "").localeCompare(String(bv ?? ""));
    return (
      (descending ? -compared : compared) || a.title.localeCompare(b.title)
    );
  });
}
export function indexCSV(songs, fields, profile, libraries, plans = []) {
  plans = buildUsageIndex(plans);
  const cell = (value) => {
    let text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return [
    fields.map((f) => cell(f.label)).join(","),
    ...songs.map((s) =>
      fields
        .map((f) => cell(indexedValue(s, f.id, profile, libraries, plans)))
        .join(","),
    ),
  ].join("\r\n");
}
