import test from'node:test';import assert from'node:assert/strict';
import{searchSongs}from'../public/core.js';import{createSongMatcher,completedPlanCounts,recordingRelease,sortCollectionSongs,findCollections,sortCollections}from'../public/collection-browse.js';
import{saveIndicator}from'../public/save-status.js';import{workspaceSignature}from'../public/saving.js';
import{portraitMetadata,loadArtistPortraits}from'../public/artist-portraits.js';import{validateRecordings}from'../public/recordings.js';
const songs=[{id:'z',title:'Zion',author:'Writer',themes:[],recordings:[{releaseDate:'2018-06-01'}]},{id:'a',title:'Amazing Grace',author:'Writer',themes:[],recordings:[]},{id:'b',title:'Behold',author:'Writer',themes:[],recordings:[{releaseDate:'2024-03-01'},{releaseDate:'2001-03-01'}]}];
test('collection relevance mixes editorial entry points and brings explicit query matches first while old descriptors remain searchable',()=>{
 const packs=[{id:'hymns',name:'Held by Grace',subtitle:'Grace & assurance',group:'Themes',description:'',browseOrder:0},{id:'artist',name:'A Writer',group:'Artists',description:'',browseOrder:1}];
 assert.deepEqual(sortCollections(packs,()=>songs).map(p=>p.id),['hymns','artist']);
 assert.deepEqual(sortCollections(packs,()=>songs,'A Writer').map(p=>p.id),['artist','hymns']);
 assert.deepEqual(sortCollections(packs,()=>songs,'','alphabetical').map(p=>p.id),['artist','hymns']);
 assert.deepEqual(findCollections(packs,()=>[],'Grace assurance').map(p=>p.id),['hymns']);
 assert.equal(packs[0].id,'hymns');
});
test('collection title lookup, alphabetic/known-date sorting and completed-plan popularity never invent rankings',()=>{
 assert.deepEqual(sortCollectionSongs(songs).map(s=>s.id),['a','b','z']);assert.deepEqual(sortCollectionSongs(songs,'oldest').map(s=>s.id),['b','z','a']);assert.deepEqual(sortCollectionSongs(songs,'newest').map(s=>s.id),['z','b','a']);assert.equal(recordingRelease(songs[2]),'2001-03-01');
 const counts=completedPlanCounts([{status:'draft',items:[{type:'song',songId:'a'}]},{status:'completed',items:[{type:'song',songId:'z'},{type:'song',songId:'z'}]}]);assert.deepEqual(sortCollectionSongs(songs,'popularity',counts).map(s=>s.id),['z','a','b']);
 const packs=[{id:'one',name:'Test collection',group:'Artists',description:'Music'},{id:'two',name:'Other',group:'Eras',description:''}];assert.deepEqual(findCollections(packs,()=>songs,'Amazing Grace','Artists').map(p=>p.id),['one']);
 const matcher=createSongMatcher(songs);assert.equal(matcher({id:'custom',title:'AMAZING GRACE',author:'Writer'}).id,'a');
});
test('cached search sees changed titles, attribution and themes without reusing stale text',()=>{
 const song={id:'x',title:'Original',author:'Writer',themes:['Joy']};assert.equal(searchSongs([song],'Original').length,1);song.title='Changed';song.author='New artist';song.themes=['Lament'];assert.equal(searchSongs([song],'Original Joy').length,0);assert.equal(searchSongs([song],'Changed New Lament').length,1);
});
test('save badge stays unsaved for forms, failures and newer edits, then becomes saved only for the acknowledged snapshot',()=>{
 const workspace={version:1,value:'new'},status={phase:'local',signature:workspaceSignature(workspace)};
 assert.equal(saveIndicator(status,workspace).state,'saved');assert.equal(saveIndicator(status,workspace,{formDirty:true}).state,'unsaved');assert.equal(saveIndicator({...status,phase:'saving'},workspace).state,'saving');assert.equal(saveIndicator({...status,phase:'error'},workspace).state,'unsaved');assert.equal(saveIndicator(status,{...workspace,value:'newer'}).state,'unsaved');
 assert.equal(saveIndicator(status,workspace,{signedIn:false}).label,'Saved on this device');assert.equal(saveIndicator(status,workspace,{localFailed:true}).state,'unsaved');
});
test('artist portraits require fixed identities, subject images and safe attributed Commons metadata',async()=>{
 const info={thumburl:'https://upload.wikimedia.org/wikipedia/commons/test/Fixture.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Fixture.jpg',extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'<a>Fixture author</a>'}}};assert.equal(portraitMetadata(info,'Test subject','Fixture photo.jpg').credit,'Fixture author');assert.equal(portraitMetadata(info,'Test subject','Artist logo.svg'),null);assert.equal(portraitMetadata({...info,extmetadata:{}},'Test subject','Photo.jpg'),null);assert.throws(()=>portraitMetadata({...info,thumburl:'https://attacker.test/artist.jpg'},'Test subject','Photo.jpg'));assert.deepEqual(await loadArtistPortraits('unmapped private input',{fetcher:()=>{throw new Error('must not send user input');}}),[]);
});
test('recording dates survive link validation and impossible dates are rejected',()=>{
 const link={id:'apple',provider:'appleMusic',url:'https://music.apple.com/us/song/123456789',label:'Exact song',releaseDate:'2020-02-29'};assert.equal(validateRecordings([link])[0].releaseDate,link.releaseDate);assert.throws(()=>validateRecordings([{...link,releaseDate:'2026-02-30'}]),/real recording/);
});
