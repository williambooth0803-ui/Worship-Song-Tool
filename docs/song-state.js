export const visibleSongs = songs => songs.filter(song => song.blacklisted !== true);
export function retainedAiReview(song) {
  if (song.aiDismissed) return null;
  return song.aiReview || (song.review.status === "ai" ? song.review : song.catalogReview?.status === "ai" ? song.catalogReview : null);
}
export function humanFirst(song) {
  if (song.review.status !== "ai" || song.review.previous?.status !== "manual") return song;
  const ai = structuredClone(song.review), human = structuredClone(song.review.previous);
  delete ai.previous;
  for (const key of ["notes", "key", "minutes", "musical"]) human[key] = song.review[key];
  if (song.review.assistance) human.assistance = structuredClone(song.review.assistance);
  song.review = human;
  song.aiReview = ai;
  return song;
}
