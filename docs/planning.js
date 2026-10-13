export function copyPlan(
  plan,
  { title, date = "" } = {},
  newId = () => crypto.randomUUID(),
) {
  return {
    ...structuredClone(plan),
    id: newId(),
    title: title || `${plan.title.slice(0, 190)} (copy)`,
    date,
    status: "draft",
    items: plan.items.map((item) => ({
      ...structuredClone(item),
      id: newId(),
    })),
  };
}
export function songUsage(plans, songId) {
  if (plans instanceof Map)
    return plans.get(songId) || { planned: 0, completed: 0, lastUsed: null };
  const matches = plans.filter((p) =>
    p.items.some((i) => i.type === "song" && i.songId === songId),
  );
  const completed = matches.filter((p) => p.status === "completed");
  return {
    planned: matches.length,
    completed: completed.length,
    lastUsed:
      completed
        .map((p) => p.date)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
  };
}
export function buildUsageIndex(plans) {
  if (plans instanceof Map) return plans;
  const index = new Map();
  for (const plan of plans)
    for (const id of new Set(
      plan.items.filter((i) => i.type === "song").map((i) => i.songId),
    )) {
      const usage = index.get(id) || {
        planned: 0,
        completed: 0,
        lastUsed: null,
      };
      usage.planned++;
      if (plan.status === "completed") {
        usage.completed++;
        if (plan.date && (!usage.lastUsed || plan.date > usage.lastUsed))
          usage.lastUsed = plan.date;
      }
      index.set(id, usage);
    }
  return index;
}
export function elapsedTime(minutes) {
  const seconds = Math.round(Number(minutes) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function parsePitch(value) {
  if (typeof value !== "string") return null;
  const match = value
    .trim()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .match(/^([A-Ga-g])([#b]?)(-1|[0-9])$/);
  if (!match) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[
    match[1].toUpperCase()
  ];
  const pitch =
    12 * (Number(match[3]) + 1) +
    base +
    (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  return pitch >= 0 && pitch <= 127 ? pitch : null;
}
export function selectedArrangement(song) {
  return (
    song.arrangements?.find((a) => a.id === song.preferredArrangementId) || null
  );
}
export function rangeSpan(arrangement) {
  if (!arrangement) return null;
  const low = parsePitch(arrangement.lowNote),
    high = parsePitch(arrangement.highNote);
  return low === null || high === null ? null : high - low;
}
export function planOutline(plan, songs) {
  const minutes = plan.items.reduce((n, i) => n + i.minutes, 0);
  let elapsed = 0;
  return [
    plan.title,
    plan.date,
    plan.theme,
    plan.passage,
    `Status: ${plan.status || "draft"}`,
    `Estimated duration: ${minutes} minutes`,
    "",
    ...plan.items.map((item, i) => {
      if (item.type === "heading") return `\n${item.title.toUpperCase()}\n` ;
      const song = songs.find((s) => s.id === item.songId);
      const timing = elapsedTime(elapsed);
      elapsed += item.minutes;
      return `${i + 1}. ${timing} · ${song?.title || item.title} — ${item.minutes} min\n   ${item.role || ""}${item.key ? ` · Key: ${item.key}` : ""}${item.arrangementName ? ` · Arrangement: ${item.arrangementName}` : ""}\n   ${item.notes || ""}`;
    }),
  ]
    .filter((v) => v !== undefined)
    .join("\n");
}
