import test from "node:test";
import assert from "node:assert/strict";
import { visibleSongs, humanFirst, retainedAiReview } from "../public/song-state.js";
import { objectiveFacts } from "../public/song-presentation.js";
import { artistCollections } from "../public/artist-collections.js";
import { songCollections, importSongs } from "../public/collections.js";
import { allCatalogSongs, syncCatalog } from "../public/catalog.js";
import { defaultProfile } from "../public/core.js";
import { validateWorkspace } from "../public/backup.js";
const state = () => syncCatalog({version:1,songs:[],profile:defaultProfile,libraries:[{id:"mine",name:"My songs",songIds:[]}],plans:[]});
test("blacklisting hides a record without deleting data and bulk imports cannot restore it", () => {
  const s = state(), song = s.songs[0]; song.blacklisted = true; song.review.notes = "Keep my notes";
  s.libraries[0].songIds.push(song.id);
  assert.ok(!visibleSongs(s.songs).some(x=>x.id===song.id));
  const result = importSongs(s,allCatalogSongs,{libraryId:"mine"});
  const kept = result.workspace.songs.find(x=>x.id===song.id);
  assert.equal(kept.blacklisted,true); assert.equal(kept.review.notes,"Keep my notes");
  assert.deepEqual(validateWorkspace(result.workspace).songs.find(x=>x.id===song.id).blacklisted,true);
  kept.blacklisted=false; assert.ok(visibleSongs(result.workspace.songs).includes(kept));
});
test("legacy drafts migrate to human-first evaluations without nesting or losing human notes", () => {
  const song=state().songs[0], human=structuredClone(song.review);human.status="manual";human.summary="Human findings";
  song.review.previous=human;song.review.notes="Latest personal note";
  humanFirst(song);assert.equal(song.review.summary,"Human findings");assert.equal(song.review.notes,"Latest personal note");
  assert.equal(song.aiReview.status,"ai");assert.ok(!song.aiReview.previous);
  song.aiDismissed=true;assert.equal(retainedAiReview(song),null);
  assert.equal(syncCatalog({...state(),songs:[song]}).songs[0].aiDismissed,true);
});
test("objective display omits empty fields and distinguishes estimates from confirmed values", () => {
  const song=state().songs[0];
  assert.ok(!objectiveFacts(song).some(f=>f.field==="tempo"));
  assert.equal(objectiveFacts(song).find(f=>f.field==="minutes").provenance.confidence,"guess");
  song.metadata={tempo:96};song.facts={tempo:{confidence:"ai",source:"Unverified estimate"},minutes:{confidence:"confirmed",source:"Observed duration"}};
  assert.equal(objectiveFacts(song).find(f=>f.field==="tempo").value,"96 BPM");
  assert.equal(objectiveFacts(song).find(f=>f.field==="minutes").provenance.confidence,"confirmed");
});
test("expanded discovery includes every requested artist and usable era/theme groupings", () => {
  assert.ok(allCatalogSongs.length===976);assert.equal(artistCollections.length,42);
  const packs=songCollections.filter(p=>p.group==="Artists");
  for(const [name]of artistCollections){const p=packs.find(p=>p.name===name);assert.ok(p?.songIds.length>=1,name);}
  for(const group of ["Eras","Themes","Styles"])assert.ok(songCollections.filter(p=>p.group===group).length>=3);
});
test("backup validation preserves blacklist, secondary evaluation, fact provenance and private file references", () => {
  const s=state(),song=s.songs[0];song.blacklisted=true;song.aiReview=structuredClone(song.review);
  song.facts={tempo:{confidence:"guess",source:"Estimate"}};
  song.files=[{id:"file-1",name:"Chart.pdf",size:100,mime:"application/pdf",storage:"account",path:"10000000-0000-4000-8000-000000000001/holy-holy-holy/file-1-chart.pdf"}];
  assert.deepEqual(validateWorkspace(s).songs[0].files,song.files);
  song.blacklisted="yes";assert.throws(()=>validateWorkspace(s),/blacklisted/);
});
