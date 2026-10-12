export function songResourceLinks(song) {
  const artist = song.author.replace(/^Associated recording:\s*/i, "").split(" · ")[0];
  const title = song.title.replace(/\s*\([^)]*\)/g, "").trim();
  const query = JSON.stringify(title) + " " + artist;
  return {
    lyrics: "https://www.google.com/search?q=" + encodeURIComponent(query + " lyrics"),
    reviews: "https://www.google.com/search?q=" + encodeURIComponent(query + " worship song theological review"),
  };
}
