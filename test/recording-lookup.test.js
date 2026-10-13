import test from "node:test";
import assert from "node:assert/strict";
import { matchTracks } from "../scripts/lookup-recordings.mjs";

test("recording lookup requires the complete title and recording artist, including version qualifiers", () => {
  const song = { title: "Jesus, Strong and Kind", author: "Associated recording: CityAlight" };
  const track = { kind: "song", trackName: "Jesus Strong and Kind", artistName: "CityAlight" };
  assert.deepEqual(matchTracks(song, [track]), [track]);
  for (const other of [
    { ...track, trackName: "Jesus Strong and Kind (Live)" },
    { ...track, trackName: "Jesus Strong and Kind / Only a Holy God" },
    { ...track, artistName: "CityAlight Tribute Band" },
    { ...track, artistName: "CityAlight & Guest" },
    { ...track, kind: "music-video" },
  ]) assert.deepEqual(matchTracks(song, [other]), []);
  assert.deepEqual(matchTracks({ ...song, author: "CityAlight" }, [track]), []);
  assert.deepEqual(matchTracks({ ...song, author: song.author + " · verify this version" }, [track]), []);
});
