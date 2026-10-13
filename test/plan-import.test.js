import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPlanImport,importedPlan,planImportPrompt,exportPlanJSON} from '../public/plan-import.js';
import {seedSongs} from '../public/seeds.js';
import {validateWorkspace} from '../public/backup.js';
import {defaultProfile} from '../public/core.js';
import {insertPlanItems,movePlanItem} from '../public/plan-ui.js';
import {mergeWorkspaces} from '../public/workspace-merge.js';
const song=seedSongs[0],workspace={version:1,songs:structuredClone(seedSongs),profile:defaultProfile,libraries:[{id:'me',name:'My songs',songIds:[song.id]}],plans:[]};
const sample={schema:'faithful-plan-v1',title:'Source order',date:'2026-10-13',uncertainties:[],items:[{type:'heading',title:'Gathering',minutes:0},{type:'song',title:song.title,artist:song.author,songId:song.id,minutes:4},{type:'other',title:'Scripture',minutes:3,notes:'Psalm 46'}]};
test('unambiguous existing plan imports without an extra confirmation, with headings, song versions and provenance preserved',()=>{
 const draft=inspectPlanImport(sample,seedSongs);assert.equal(draft.needsReview,false);const plan=importedPlan(draft,seedSongs);assert.equal(plan.items[0].minutes,0);assert.equal(plan.items[1].songId,song.id);
 const checked=validateWorkspace({...workspace,plans:[plan]});assert.deepEqual(checked.plans[0],plan);
 assert.equal(inspectPlanImport(exportPlanJSON(plan,seedSongs),seedSongs).needsReview,false);
 const privateWorkspace=structuredClone(workspace);privateWorkspace.songs[0].review.notes='PRIVATE_PLAN_NOTE_DO_NOT_COPY';assert.ok(!planImportPrompt(privateWorkspace).includes('PRIVATE_PLAN_NOTE_DO_NOT_COPY'));
});
test('missing durations and conflicting identities require human resolution, while blacklist and unsafe structures stay excluded',()=>{
 const value=structuredClone(sample);value.items[1].minutes=null;value.items[1].title='Different song';
 const draft=inspectPlanImport(value,seedSongs);assert.equal(draft.needsReview,true);
 assert.throws(()=>importedPlan(draft,seedSongs),/Review/);assert.throws(()=>importedPlan(draft,seedSongs,{},true),/duration/);
 const fixed=importedPlan(draft,seedSongs,{1:{songId:'__text__',minutes:5}},true);assert.equal(fixed.items[1].type,'other');
 const hidden=seedSongs.map(s=>({...s,blacklisted:s.id===song.id}));assert.equal(inspectPlanImport(sample,hidden).needsReview,true);
 assert.throws(()=>inspectPlanImport({...sample,date:'2026-02-31'},seedSongs),/real calendar/);
 assert.throws(()=>inspectPlanImport({...sample,items:[{type:'javascript',title:'x'}]},seedSongs),/unsupported/);
});
test('relative insertion and reordering preserve all item IDs and correctly handle first/last positions',()=>{
 const plan={items:[{id:'a'},{id:'b'},{id:'c'}]};insertPlanItems(plan,[{id:'d'},{id:'e'}],'a');assert.deepEqual(plan.items.map(i=>i.id),['a','d','e','b','c']);movePlanItem(plan,'c','a');assert.deepEqual(plan.items.map(i=>i.id),['c','a','d','e','b']);assert.throws(()=>insertPlanItems(plan,[{id:'f'}],'missing'),/insertion/);
});
test('shared workspace merges disjoint library/plan edits but stops conflicting content and ordering',()=>{
 const base={libraries:[{id:'l',songIds:['a']}],plans:[{id:'p',title:'Plan',items:[{id:'i',notes:'before'},{id:'j',notes:''}]}]};
 const local=structuredClone(base),remote=structuredClone(base);local.libraries[0].songIds.push('b');remote.libraries[0].songIds.push('c');local.plans[0].title='Local name';remote.plans[0].items[0].notes='Remote note';
 const merged=mergeWorkspaces(base,local,remote);assert.deepEqual(new Set(merged.libraries[0].songIds),new Set(['a','b','c']));assert.equal(merged.plans[0].title,'Local name');assert.equal(merged.plans[0].items[0].notes,'Remote note');
 remote.plans[0].title='Other name';assert.throws(()=>mergeWorkspaces(base,local,remote),/Two people/);
});
