import test from 'node:test';
import assert from 'node:assert/strict';
import {createLens,switchLens,renameActiveLens} from '../public/lenses.js';
import {validateWorkspace} from '../public/backup.js';
import {defaultProfile,overall} from '../public/core.js';
import {catalogSongs,syncCatalog} from '../public/catalog.js';
import {evaluationToken} from '../public/workspace-evaluation.js';
const fixture=()=>({version:1,profile:structuredClone(defaultProfile),songs:structuredClone(catalogSongs.slice(0,2)),libraries:[{id:'mine',name:'My repertoire',songIds:[catalogSongs[0].id]}],plans:[]});
test('lenses isolate criteria, custom scores, human/AI reviews and dismissal through validated backup round trips',()=>{
 let w=fixture();const first=w.songs[0];first.review.status='manual';first.review.scores={accuracy:10,substance:4,language:3,time:null};first.review.customScores={'custom-teaching':8};first.review.notes='Shared personal note';first.recordings=[];
 w=createLens(w,{id:'prayer',name:'Prayer night',purpose:'Intimate prayer and response'});
 w.profile.weights={accuracy:0,substance:0,language:100,time:0};w.songs[0].review.scores.language=9;w.songs[0].review.customScores['custom-teaching']=2;w.songs[0].aiDismissed=true;w.songs[0].review.notes='Updated note';
 assert.equal(overall(w.songs[0].review,w.profile),9);
 w=validateWorkspace(switchLens(w,'main'));
 assert.equal(w.songs[0].review.scores.language,3);assert.equal(w.songs[0].review.customScores['custom-teaching'],8);assert.equal(w.songs[0].aiDismissed,undefined);assert.equal(w.songs[0].review.notes,'Updated note');assert.deepEqual(w.songs[0].recordings,[]);assert.deepEqual(w.libraries,fixture().libraries);
 w=validateWorkspace(switchLens(JSON.parse(JSON.stringify(w)),'prayer'));
 assert.equal(w.songs[0].review.scores.language,9);assert.equal(w.songs[0].aiDismissed,true);assert.equal(w.profile.evaluationPurpose,'Intimate prayer and response');assert.equal(w.songs[0].review.status,'manual');
});
test('newly added song evaluations do not leak into another existing lens; privacy preferences stay global',()=>{
 let w=createLens(fixture(),{id:'youth',name:'Youth'});const newSong=structuredClone(catalogSongs[3]);newSong.review.status='manual';newSong.review.scores.accuracy=1;delete newSong.catalogReview;w.songs.push(newSong);w.profile.aiMode='manual';w.profile.aiLabels=false;
 w=switchLens(w,'main');assert.equal(w.songs.at(-1).review.status,'unreviewed');assert.equal(w.songs.at(-1).review.scores.accuracy,null);assert.equal(w.profile.aiMode,'manual');assert.equal(w.profile.aiLabels,false);
 w=switchLens(w,'youth');assert.equal(w.songs.at(-1).review.scores.accuracy,1);
});
test('renaming, catalog migration, request identity and invalid backup lenses preserve or reject explicitly',()=>{
 let w=createLens(fixture(),{id:'youth',name:'Youth'});w=renameActiveLens(w,'Students');assert.equal(w.lenses[1].name,'Students');assert.throws(()=>renameActiveLens(w,'Main lens'),/unique/);
 const options={libraryIds:['mine'],criteria:['context'],purpose:'Review this library'};
 const token=evaluationToken({...w,profile:{...w.profile,aiMode:'full'}},options);
 assert.notEqual(token,evaluationToken({...w,activeLensId:'main',profile:{...w.profile,aiMode:'full'}},options));
 w=validateWorkspace(syncCatalog(w));assert.equal(w.activeLensId,'youth');assert.equal(w.lenses.length,2);
 assert.throws(()=>validateWorkspace({...w,activeLensId:'missing'}),/active lens/);
 const invalid=structuredClone(w);invalid.lenses[0].evaluations[w.songs[0].id].review.scores.accuracy=999;assert.throws(()=>validateWorkspace(invalid),/range/);
});
test('reduced catalog migration preserves a retired song and its plan/library references',async()=>{
 const {artistCatalog}=await import('../public/artist-catalog.js');const {allCatalogSongs}=await import('../public/catalog.js');
 const retired=structuredClone(artistCatalog.find(s=>!allCatalogSongs.some(c=>c.id===s.id)));retired.review.status='manual';retired.review.notes='Keep this version';retired.review.scores.accuracy=3;retired.recordings=[];
 const w=fixture();w.songs.push(retired);w.libraries[0].songIds.push(retired.id);w.plans=[{id:'old',title:'Older service',date:'',theme:'',passage:'',items:[{id:'old-item',type:'song',songId:retired.id,role:'',key:'D',minutes:4,notes:''}]}];
 const before=structuredClone(w),next=validateWorkspace(syncCatalog(w));
 assert.deepEqual(next.songs.find(s=>s.id===retired.id).review,retired.review);assert.deepEqual(next.songs.find(s=>s.id===retired.id).recordings,[]);assert.deepEqual(next.plans.map(p=>p.items),before.plans.map(p=>p.items));assert.deepEqual(next.libraries,before.libraries);
 assert.equal(allCatalogSongs.length,976);
});
