// Public catalog metadata only. No personal workspace or credentials are read.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { allCatalogSongs } from "../public/catalog.js";
import { recordingURL } from "../public/recordings.js";

export const canonical = value => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function matchTracks(song, tracks) {
  const artist = song.author.replace(/^Associated recording:\s*/, "");
  // Annotation/collaboration separators need human reconciliation; never drop them.
  if (!song.author.startsWith("Associated recording:") || artist.includes("·")) return [];
  return tracks.filter(t => t.kind === "song" && canonical(t.trackName) === canonical(song.title) && canonical(t.artistName) === canonical(artist));
}

async function main() {
  const cache = "/tmp/faithful-recording-cache";
  await mkdir(cache, { recursive: true });
  const artists = [...new Set(allCatalogSongs.filter(s => s.author.startsWith("Associated recording:") && !s.author.includes("·")).map(s => s.author.replace(/^Associated recording:\s*/, "")))];
  const evidence = {}, recordings = {}, failures = [];
  for (const artist of artists) {
    const url = new URL("https://itunes.apple.com/search");
    for (const [key, value] of Object.entries({ term: artist, entity: "song", attribute: "artistTerm", country: "US", limit: "200" })) url.searchParams.set(key, value);
    const file = `${cache}/${createHash("sha256").update(url.href).digest("hex")}.json`;
    let response;
    try { response = JSON.parse(await readFile(file, "utf8")); } catch {
      // Sequential requests, below Apple's documented approximate 20/minute limit.
      await new Promise(resolve => setTimeout(resolve, 3200));
      try {
        const result = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!result.ok) throw new Error(`HTTP ${result.status}`);
        const data = await result.json();
        if (!Array.isArray(data.results)) throw new Error("Invalid Apple response");
        response = { fetchedAt: new Date().toISOString(), request: url.href, data };
        await writeFile(file, JSON.stringify(response));
      } catch (error) { failures.push({ artist, error: error.message }); console.log(`${artist}: ${error.message}`); continue; }
    }
    let count = 0;
    for (const song of allCatalogSongs.filter(s => s.author === `Associated recording: ${artist}`)) {
      const matches = matchTracks(song, response.data.results).sort((a, b) => a.trackId - b.trackId);
      const seen = new Set();
      for (const track of matches) {
        let link; try { link = recordingURL("appleMusic", track.trackViewUrl); } catch { continue; }
        if (seen.has(link)) continue;
        seen.add(link);
        if (seen.size > 3) break;
        (recordings[song.id] ||= []).push({ id: `catalog-apple-${track.trackId}`, provider: "appleMusic", label: `${track.artistName} · ${track.collectionName}`, url: link, ...(track.artworkUrl100 ? {artwork: track.artworkUrl100} : {}), ...(track.releaseDate ? {releaseDate: track.releaseDate.slice(0,10)} : {}) });
        (evidence[song.id] ||= []).push({ trackId: track.trackId, title: track.trackName, artist: track.artistName, album: track.collectionName, artwork: track.artworkUrl100 || null, releaseDate: track.releaseDate?.slice(0,10) || null, url: link, country: "US", fetchedAt: response.fetchedAt, source: response.request });
      }
      if (recordings[song.id]) count++;
    }
    console.log(`${artist}: ${count} catalog titles matched`);
  }
  await writeFile(new URL("../public/catalog-recordings.js", import.meta.url), `// Exact title/artist matches from Apple's US metadata; availability may change.\n// See RECORDING-LOOKUP-ACCESS.md and data/recording-evidence.json.\nexport const catalogRecordings = ${JSON.stringify(recordings, null, 2)};\n`);
  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(new URL("../data/recording-evidence.json", import.meta.url), JSON.stringify({ method: "Exact normalized title and full recording artist; no inferred measurements or church approval", region: "US", songlink: { status: 401, code: "PUBLIC_API_ACCESS_DEPRECATED" }, evidence, failures }, null, 2) + "\n");
  console.log(`Matched ${Object.keys(recordings).length} records; ${failures.length} failed artist requests.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) await main();
