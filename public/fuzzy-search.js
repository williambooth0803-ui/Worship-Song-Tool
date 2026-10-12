import { normalize } from "./core.js";

// Optimal-string-alignment distance also handles adjacent transposed letters.
function distance(a, b) {
  let older = null;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (older && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j], older[j - 2] + 1);
    }
    older = previous;
    previous = row;
  }
  return previous[b.length];
}
const similarity = (a, b) => a && b ? 1 - distance(a, b) / Math.max(a.length, b.length) : 0;
function matchScore(query, value) {
  const text = normalize(value).slice(0, 180);
  if (!text) return 0;
  const tokens = text.split(" ");
  const wordScore = query.split(" ").reduce((total, word) => total + Math.max(
    ...tokens.map((token) => token.startsWith(word) ? 0.94 : similarity(word, token)),
  ), 0) / query.split(" ").length;
  return Math.max(similarity(query, text), similarity(query.replaceAll(" ", ""), text.replaceAll(" ", "")),
    wordScore * 0.9);
}
export function closestSongs(songs, query, limit = 5) {
  const text = normalize(query).slice(0, 120);
  if (text.length < 3) return [];
  const ranked = songs.map((song) => ({
    song,
    score: Math.max(matchScore(text, song.title),
      matchScore(text, song.author.replace(/^Associated recording:\s*/i, "")) * 0.84),
  })).filter((item) => item.score >= 0.42)
    .sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title));
  const cutoff = Math.max(0.42, (ranked[0]?.score || 0) - 0.18);
  return ranked.filter(item => item.score >= cutoff)
    .slice(0, Math.min(8, Math.max(1, limit))).map((item) => item.song);
}
