import { dimensions } from "./core.js";

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

// Construct a new workspace from known fields; imported data never directly
// becomes application state. Invalid references or shapes reject the whole file.
export function validateWorkspace(input) {
  const fail = (message) => {
    throw new Error(`Invalid backup: ${message}`);
  };
  const object = (value, label) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(`${label} must be an object.`);
    return value;
  };
  const text = (value, label, max = 6000, required = false) => {
    if (
      typeof value !== "string" ||
      value.length > max ||
      (required && !value.trim())
    )
      fail(`${label} is missing or too long.`);
    return value;
  };
  const number = (value, label, min, max) => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      fail(`${label} is out of range.`);
    return value;
  };
  const array = (value, label, max = 100) => {
    if (!Array.isArray(value) || value.length > max)
      fail(`${label} must be a list of up to ${max} items.`);
    return value;
  };
  const texts = (value, label) =>
    array(value, label).map((x) => text(x, label));
  const choice = (value, label, choices) => {
    if (!choices.includes(value)) fail(`${label} is not recognized.`);
    return value;
  };
  const id = (value) => text(value, "ID", 200, true);
  const unique = (values, label) => {
    if (new Set(values).size !== values.length)
      fail(`${label} contains duplicate IDs.`);
  };
  const review = (value, previous = false) => {
    object(value, "assessment");
    object(value.scores, "scores");
    const result = {
      scores: Object.fromEntries(
        Object.keys(dimensions).map((k) => [
          k,
          value.scores[k] === null ? null : number(value.scores[k], k, 0, 10),
        ]),
      ),
      status: choice(value.status, "review status", [
        "starter",
        "unreviewed",
        "manual",
        "ai",
      ]),
      concern: choice(value.concern, "doctrinal concern", [
        "none",
        "context",
        "serious",
      ]),
      minutes: number(value.minutes, "song duration", 0.5, 60),
      sources: array(value.sources, "sources").map((source) => {
        object(source, "source");
        const url = text(source.url, "source URL", 6000);
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          fail("a source URL is invalid.");
        }
        if (
          !["http:", "https:"].includes(parsed.protocol) ||
          parsed.username ||
          parsed.password
        )
          fail("source URLs must be public HTTP or HTTPS links.");
        return { url, label: text(source.label, "source label") };
      }),
    };
    for (const key of [
      "summary",
      "language",
      "time",
      "musical",
      "notes",
      "key",
    ])
      result[key] = text(value[key], key);
    for (const key of ["claims", "concerns", "uses", "scriptures"])
      result[key] = texts(value[key], key);
    if (value.themes !== undefined)
      result.themes = texts(value.themes, "assessment themes");
    if (value.model !== undefined)
      result.model = text(value.model, "model", 200);
    if (value.updatedAt !== undefined && value.updatedAt !== null) {
      result.updatedAt = text(value.updatedAt, "review date", 100);
      if (!Number.isFinite(Date.parse(result.updatedAt)))
        fail("the review date is invalid.");
    } else result.updatedAt = null;
    if (value.previous !== undefined) {
      if (previous) fail("assessment history is too deeply nested.");
      result.previous = review(value.previous, true);
    }
    return result;
  };
  object(input, "workspace");
  if (input.version !== 1) fail("this backup version is not supported.");
  const songs = array(input.songs, "songs", 5000).map((song) => {
    object(song, "song");
    return {
      id: id(song.id),
      title: text(song.title, "song title", 200, true),
      author: text(song.author, "song author", 1000),
      firstLine: text(song.firstLine, "opening line", 1000),
      version: text(song.version, "song version", 1000),
      themes: texts(song.themes, "themes"),
      review: review(song.review),
    };
  });
  unique(
    songs.map((s) => s.id),
    "songs",
  );
  const songIds = new Set(songs.map((s) => s.id));
  const libraries = array(input.libraries, "libraries", 100).map((library) => {
    object(library, "library");
    const ids = array(library.songIds, "library songs", 5000).map(id);
    unique(ids, "library songs");
    if (ids.some((x) => !songIds.has(x)))
      fail("a library references a missing song.");
    return {
      id: id(library.id),
      name: text(library.name, "library name", 100, true),
      songIds: ids,
    };
  });
  if (!libraries.length) fail("at least one library is required.");
  unique(
    libraries.map((l) => l.id),
    "libraries",
  );
  const plans = array(input.plans, "plans", 1000).map((plan) => {
    object(plan, "plan");
    const items = array(plan.items, "service items", 1000).map((item) => {
      object(item, "service item");
      const result = {
        id: id(item.id),
        type: choice(item.type, "item type", ["song", "other"]),
        minutes: number(item.minutes, "item duration", 0.5, 180),
        role: text(item.role, "item role", 100),
        notes: text(item.notes, "item notes"),
      };
      if (item.type === "song") {
        result.songId = id(item.songId);
        if (!songIds.has(result.songId))
          fail("a plan references a missing song.");
        result.key = text(item.key, "item key", 100);
      } else result.title = text(item.title, "item title", 200, true);
      return result;
    });
    unique(
      items.map((i) => i.id),
      "service items",
    );
    const date = text(plan.date, "plan date", 10);
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      fail("the plan date is invalid.");
    return {
      id: id(plan.id),
      title: text(plan.title, "plan title", 200, true),
      date,
      theme: text(plan.theme, "plan theme", 500),
      passage: text(plan.passage, "sermon passage", 200),
      items,
    };
  });
  unique(
    plans.map((p) => p.id),
    "plans",
  );
  const profile = object(input.profile, "profile");
  object(profile.weights, "rating weights");
  const weights = Object.fromEntries(
    Object.keys(dimensions).map((k) => [
      k,
      number(profile.weights[k], "rating weight", 0, 100),
    ]),
  );
  if (!Object.values(weights).some((w) => w > 0))
    fail("at least one rating weight must be positive.");
  return {
    version: 1,
    songs,
    libraries,
    plans,
    profile: {
      weights,
      principles: text(profile.principles, "rating parameters", 6000, true),
    },
  };
}
