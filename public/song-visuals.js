export function artworkURL(value) {
  if (typeof value !== "string" || value.length > 2000) throw new Error("Invalid album artwork URL.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !/^(?:is\d(?:-ssl)?)\.mzstatic\.com$/.test(url.hostname) || !url.pathname.startsWith("/image/")) throw new Error("Use artwork supplied by Apple's recording metadata.");
  return url.href;
}
export function songArtwork(song) {
  if (song.category === "traditional") return null;
  const recording = song.recordings?.find(r => r.artwork);
  if (!recording) return null;
  try { return { url: artworkURL(recording.artwork), label: recording.label || song.title, recordingURL: recording.url }; } catch { return null; }
}
export function hymnaryLink(song) {
  return ["traditional", "modern"].includes(song.category)
    ? "https://hymnary.org/search?qu=" + encodeURIComponent('textName:"' + song.title.replace(/"/g, "") + '"') : null;
}
export const previousDecision = song => song.approval && song.approval.status !== "unreviewed" ? song.approval : song.legacyApproval || song.approval;
export const starterLibraries = [
  ["ready", "Ready to use", ["approved"]],
  ["evaluate", "Needs evaluation", ["unreviewed"]],
  ["context", "Use with context", ["context"]],
  ["not-for-us", "Not for our church", ["avoid"]],
];
export function addStarterLibraries(workspace, migrate = false, newId = () => crypto.randomUUID()) {
  const next = structuredClone(workspace);
  for (const [,name,statuses] of starterLibraries) {
    let library = next.libraries.find(l => l.name === name);
    if (!library) { library = { id: newId(), name, songIds: [] }; next.libraries.push(library); }
    if (migrate) library.songIds = [...new Set([...library.songIds, ...next.songs.filter(s => !s.blacklisted && statuses.includes(previousDecision(s)?.status)).map(s => s.id)])];
  }
  return next;
}
