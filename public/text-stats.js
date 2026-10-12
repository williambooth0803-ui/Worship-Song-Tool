const cache = new WeakMap();
export function textStats(song) {
  const text = song.metadata?.lyrics?.trim();
  if (cache.get(song)?.text === text && cache.has(song))
    return cache.get(song).stats;
  if (!text)
    return {
      wordCount: null,
      uniqueWords: null,
      justCount: null,
      interiorJust: null,
      ohCount: null,
      repeatedLines: null,
    };
  const words = (line) =>
    (
      line
        .toLowerCase()
        .normalize("NFKC")
        .match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []
    ).map((w) => w.replace(/’/g, "'"));
  const lines = text
      .split(/\r?\n/)
      .map(words)
      .filter((w) => w.length),
    all = lines.flat(),
    seen = new Set();
  let repeatedLines = 0,
    interiorJust = 0;
  for (const line of lines) {
    const normalized = line.join(" ");
    if (seen.has(normalized)) repeatedLines++;
    seen.add(normalized);
    interiorJust += line.slice(1, -1).filter((w) => w === "just").length;
  }
  const stats = {
    wordCount: all.length,
    uniqueWords: new Set(all).size,
    justCount: all.filter((w) => w === "just").length,
    interiorJust,
    ohCount: all.filter((w) => w === "oh").length,
    repeatedLines,
  };
  cache.set(song, { text, stats });
  return stats;
}
