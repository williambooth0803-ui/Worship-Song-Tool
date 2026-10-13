export const recordingPlatforms = {
  appleMusic: "Apple Music",
  spotify: "Spotify",
  youtube: "YouTube",
};

// Search is a finding aid, not a claim that a specific recording was verified.
// Traditional attribution usually names a writer, not a recording artist.
export function recordingSearchLinks(song) {
  const association = /^Associated recording:\s*/i.test(song.author);
  const artist = association ? song.author.replace(/^Associated recording:\s*/i, "").replace(/\s*·\s*/g, " ") : "";
  const query = [song.title, artist, !association && song.category === "traditional" ? "hymn" : ""].filter(Boolean).join(" ");
  return {
    appleMusic: "https://music.apple.com/us/search?term=" + encodeURIComponent(query),
    spotify: "https://open.spotify.com/search/" + encodeURIComponent(query),
    youtube: "https://www.youtube.com/results?search_query=" + encodeURIComponent(query),
  };
}

export function recordingURL(provider, value) {
  const fail = () => { throw new Error(`Use a full HTTPS ${recordingPlatforms[provider] || "recording"} song or video link.`); };
  if (!Object.hasOwn(recordingPlatforms, provider) || typeof value !== "string" || value.length > 2000) fail();
  let url;
  try { url = new URL(value.trim()); } catch { fail(); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) fail();
  if (provider === "spotify") {
    if (url.hostname !== "open.spotify.com" || !/^\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]{22}\/?$/.test(url.pathname)) fail();
    return "https://open.spotify.com/track/" + url.pathname.split("/").filter(Boolean).at(-1);
  }
  if (provider === "appleMusic") {
    if (!["music.apple.com", "itunes.apple.com"].includes(url.hostname)) fail();
    const path = url.pathname;
    if (!/^\/[a-z]{2}\/(?:song|album|music-video)\/(?:[^/]+\/)?(?:id)?\d+\/?$/.test(path)) fail();
    if (/\/album\//.test(path) && !/^(?:id)?\d+$/.test(url.searchParams.get("i") || "")) fail();
    const result = new URL("https://music.apple.com" + path.replace(/\/id(\d+)/g, "/$1"));
    if (/\/album\//.test(path)) result.searchParams.set("i", url.searchParams.get("i").replace(/^id/, ""));
    return result.href;
  }
  let video;
  if (url.hostname === "youtu.be") video = url.pathname.slice(1);
  else if (["www.youtube.com", "youtube.com", "music.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    if (url.pathname === "/watch") video = url.searchParams.get("v");
    else video = /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(video || "")) fail();
  const result = new URL("https://www.youtube.com/watch"); result.searchParams.set("v", video);
  const time = url.searchParams.get("t");
  if (time && /^(?:\d+h)?(?:\d+m)?(?:\d+s?|\d+m\d+s)$/.test(time)) result.searchParams.set("t", time);
  return result.href;
}

export function validateRecordings(value) {
  if (!Array.isArray(value) || value.length > 30) throw new Error("A song can have up to 30 recording links.");
  const result = value.map(item => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim() || item.id.length > 200 || typeof item.label !== "string" || item.label.length > 300)
      throw new Error("A recording needs a valid ID and a label of up to 300 characters.");
    return { id: item.id, provider: item.provider, label: item.label.trim(), url: recordingURL(item.provider, item.url) };
  });
  if (new Set(result.map(r => r.id)).size !== result.length) throw new Error("Recording IDs must be distinct.");
  if (new Set(result.map(r => r.provider + ":" + r.url)).size !== result.length) throw new Error("This recording link is already saved.");
  return result;
}

export function recordingLinks(song) {
  const searches = recordingSearchLinks(song);
  return Object.entries(recordingPlatforms).map(([provider, platform]) => {
    const saved = song.recordings?.find(r => r.provider === provider);
    return { provider, platform, url: saved?.url || searches[provider], exact: Boolean(saved), label: saved?.label || "", searchURL: searches[provider] };
  });
}
