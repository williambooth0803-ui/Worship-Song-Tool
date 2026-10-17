import test from 'node:test';import assert from 'node:assert/strict';
import {songArtwork,hymnaryLink,artworkURL,addStarterLibraries,previousDecision} from '../public/song-visuals.js';
import {catalogRecordings} from '../public/catalog-recordings.js';
import {invalidateApproval,syncCatalog} from '../public/catalog.js';
import {seedSongs} from '../public/seeds.js';import {defaultProfile} from '../public/core.js';import {validateWorkspace} from '../public/backup.js';
test('album images use provider metadata and respect traditional hymns, personal recordings and removal',()=>{
 const recording=Object.values(catalogRecordings).flat().find(r=>r.artwork);
 const song={title:'Exact recording',category:'worship',recordings:[recording]};assert.equal(songArtwork(song).url,recording.artwork);assert.equal(songArtwork({...song,category:'traditional'}),null);assert.equal(songArtwork({...song,recordings:[]}),null);assert.equal(songArtwork({...song,recordings:[{provider:'youtube',url:'https://youtu.be/abcdefghijk'}]}),null);
 assert.throws(()=>artworkURL('https://attacker.test/image/album.jpg'));assert.throws(()=>artworkURL('javascript:alert(1)'));assert.throws(()=>artworkURL('https://user:secret@is1-ssl.mzstatic.com/image/x'));
});
test('Hymnary links are title-bound finding aids for hymns, rather than invented hymn IDs',()=>{
 assert.equal(hymnaryLink({category:'modern',title:'A contemporary hymn-like song'}),null);
 const url=new URL(hymnaryLink({category:'traditional',title:'Amazing Grace'}));assert.equal(url.hostname,'hymnary.org');assert.match(url.searchParams.get('qu'),/Amazing Grace/);assert.equal(hymnaryLink({category:'worship',title:'A contemporary song'}),null);
});
test('previous decisions survive an evaluation change and backups, and starter libraries migrate only by explicit choice',()=>{
 const workspace=syncCatalog({version:1,songs:structuredClone(seedSongs),profile:defaultProfile,libraries:[{id:'mine',name:'My songs',songIds:[]}],plans:[]});const song=workspace.songs[0];song.approval={status:'approved',notes:'Use this exact version.',updatedAt:null};invalidateApproval(song);assert.equal(song.approval.status,'unreviewed');assert.equal(previousDecision(song).status,'approved');
 const restored=validateWorkspace(workspace);assert.deepEqual(restored.songs[0].legacyApproval,song.legacyApproval);
 const blank=addStarterLibraries(restored,false);assert.equal(blank.libraries.find(l=>l.name==='Ready to use').songIds.length,0);
 const migrated=addStarterLibraries(restored,true);assert.ok(migrated.libraries.find(l=>l.name==='Ready to use').songIds.includes(song.id));assert.deepEqual(migrated.plans,workspace.plans);assert.equal(migrated.songs[0].legacyApproval.notes,'Use this exact version.');
});
