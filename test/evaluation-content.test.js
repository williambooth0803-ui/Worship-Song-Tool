import test from 'node:test';
import assert from 'node:assert/strict';
import {seedSongs} from '../public/seeds.js';
import {defaultProfile} from '../public/core.js';
import {evaluationSnapshot,workspaceEvaluationPrompt,parseWorkspaceEvaluation,evaluationToken} from '../public/workspace-evaluation.js';
import {evaluationContent,repeatKey} from '../public/evaluation-content.js';
import {retainEvaluation,decodeEvaluation,validateEvaluationHistory} from '../public/evaluation-history.js';
import {validateWorkspace} from '../public/backup.js';
import {mergeWorkspaces} from '../public/workspace-merge.js';
import {newPlanSong} from '../public/plan-songs.js';
const config={planIds:['p'],libraryIds:['l1','l2'],criteria:['themes','function','voice'],includeWords:true};
function fixture(){
  const songs=structuredClone(seedSongs.slice(0,2));songs[0].metadata={lyrics:'PRIVATE STORED WORDS',tempo:92};
  return {version:1,profile:{...structuredClone(defaultProfile),aiMode:'full'},songs,
    libraries:[{id:'l1',name:'First',songIds:[songs[0].id]},{id:'l2',name:'Second',songIds:songs.map(s=>s.id)}],
    plans:[{id:'p',title:'Original human plan',date:'',theme:'',passage:'',items:[songs[0],songs[0],songs[1]].map((s,i)=>({id:'i'+i,type:'song',songId:s.id,minutes:4,key:'D',role:'',notes:'PRIVATE ITEM'}))}]};
}
function response(snapshot){return {schema:'faithful-workspace-evaluation-v2',requestId:'test',summary:'Evidence from reviewed words.',strengths:[],weaknesses:[],limitations:[],
  songs:snapshot.songs.map((s,i)=>({id:s.id,textStatus:i?'unverified':'complete',evidence:i?'Words unavailable.':'Reviewed full source text.',sources:[],sections:i?[]:[
    {id:'verse',label:'Verse 1',lineCount:4,repetitions:1,repeatEvidence:'Printed once in the reference pattern.',ideas:[{criterionId:'themes',category:'trust',lineCount:4,evidence:'Reliance on God throughout this verse.'},{criterionId:'function',category:'confession',lineCount:1,evidence:'One line acknowledges sin.'},{criterionId:'voice',category:'individual',lineCount:4,evidence:'Singular first-person grammar.'}]},
    {id:'chorus',label:'Chorus',lineCount:2,repetitions:3,repeatEvidence:'The reference explicitly repeats this chorus three times.',ideas:[{criterionId:'themes',category:'trust',lineCount:2,evidence:'Trust continues in the refrain.'},{criterionId:'themes',category:'hope',lineCount:2,evidence:'The same lines also express hope.'},{criterionId:'voice',category:'corporate',lineCount:2,evidence:'The refrain uses plural first-person grammar.'}]}
  ]})),criteria:snapshot.criteria.map(c=>({id:c.id,findings:snapshot.scopes.map(scope=>({scopeId:scope.id,observation:'Descriptive evidence.',evidenceSongIds:[]})),coverage:{status:'unknown',explanation:'Mixed-scope evidence comparison.'}}))};}
function prepared(){const w=fixture(),snapshot=evaluationSnapshot(w,config),report=parseWorkspaceEvaluation(JSON.stringify(response(snapshot)),snapshot,'test');return {w,snapshot,report};}
test('overlapping ideas separate one-line coverage from repeated emphasis, occurrence weights and distinct library union',()=>{
  const {w,snapshot,report}=prepared(),before=structuredClone(w),views=evaluationContent(report,snapshot),plan=views.find(v=>v.id==='plan:p'),union=views.find(v=>v.id==='library-union');
  assert.equal(plan.totalLines,20);assert.equal(plan.total,3);assert.equal(plan.reviewed,2);assert.equal(plan.reviewedSongs,1);
  assert.equal(plan.ideas.find(i=>i.category==='confession').songCount,1);
  assert.equal(plan.ideas.find(i=>i.category==='confession').occurrenceCount,2);
  assert.equal(plan.ideas.find(i=>i.category==='confession').percent,10);
  assert.equal(plan.ideas.find(i=>i.category==='hope').percent,60);
  assert.equal(plan.ideas.find(i=>i.category==='trust').percent,100,'Overlapping themes do not partition a song');
  assert.equal(union.total,2);assert.equal(union.totalLines,10);
  const repeats={[repeatKey('plan:p','i0','chorus')]:5};
  const changed=evaluationContent(report,snapshot,repeats).find(v=>v.id==='plan:p');
  assert.equal(changed.totalLines,24);assert.equal(changed.ideas.find(i=>i.category==='hope').weightedLines,16);
  assert.equal(changed.ideas.find(i=>i.category==='confession').songCount,1);
  assert.equal(evaluationContent(report,snapshot,repeats).find(v=>v.id==='library-union').totalLines,10,'Plan performance overrides never change library text proportions');
  assert.deepEqual(w,before);
});
test('words-first requests omit musical data unless chosen, and bind only the shared selection',()=>{
  const w=fixture(),snapshot=evaluationSnapshot(w,config),token=evaluationToken(w,config),prompt=workspaceEvaluationPrompt(w,config,'test');
  assert.equal('tempo' in snapshot.songs[0],false);assert.equal('key' in snapshot.scopes.find(s=>s.type==='plan').items[0],false);assert.equal('minutes' in snapshot.scopes.find(s=>s.type==='plan').items[0],false);
  w.plans[0].items[0].key='E';assert.equal(evaluationToken(w,config),token);
  const musical=evaluationSnapshot(w,{...config,criteria:[...config.criteria,'tempo']});assert.equal(musical.songs[0].tempo,92);assert.equal('key' in musical.scopes.find(s=>s.type==='plan').items[0],false);assert.equal('lowNote' in musical.songs[0],false);
  const vocal=evaluationSnapshot(w,{...config,criteria:[...config.criteria,'participation']});assert.equal(vocal.scopes.find(s=>s.type==='plan').items[0].key,'E');assert.equal('tempo' in vocal.songs[0],false);
  assert.match(prompt,/faithful-workspace-evaluation-v2/);assert.match(prompt,/one clear line can establish/i);assert.match(prompt,/Never assume choruses or bridges/);assert.match(prompt,/Do not discuss missing tempo/);
});
test('section evidence rejects fabricated measurements, unsupported categories and executable report fields',()=>{
  const {snapshot}=prepared();
  for(const mutate of [r=>r.songs[0].sections[0].ideas[0].lineCount=5,r=>r.songs[0].sections[0].repetitions=-1,r=>r.songs[0].sections[0].repetitions=2.5,r=>r.songs[0].sections[0].ideas[0].criterionId='tempo',r=>r.songs[0].sections[0].ideas[1].category='mixed',r=>r.songs[0].sections.push(r.songs[0].sections[0]),r=>r.songs[0].textStatus='unverified',r=>r.songs[0].sources=[{label:'Invalid',url:'https://localhost/x'}],r=>r.songs[0].scores={quality:10}]){
    const raw=response(snapshot);mutate(raw);assert.throws(()=>parseWorkspaceEvaluation(JSON.stringify(raw),snapshot,'test'));
  }
});
test('saved evaluations survive backup/account serialization, keep original context and strip opted-in raw lyrics',()=>{
  const {w,snapshot,report}=prepared(),before=structuredClone(w);
  const saved=retainEvaluation(w,report,snapshot,{},'2026-10-27T12:00:00Z',()=> 'history-1');
  const restored=validateWorkspace(JSON.parse(JSON.stringify(saved.workspace)));
  assert.equal(restored.evaluationHistory.length,1);assert.ok(!restored.evaluationHistory[0].data.includes('PRIVATE STORED WORDS'));
  const archive=decodeEvaluation(restored.evaluationHistory[0]);assert.equal(archive.report.songs[0].sections[1].repetitions,3);
  restored.plans[0].title='Changed later';assert.equal(decodeEvaluation(restored.evaluationHistory[0]).snapshot.scopes.find(s=>s.type==='plan').name,'Original human plan');
  assert.equal(retainEvaluation(saved.workspace,report,snapshot).duplicate,true);assert.deepEqual(w,before);
  assert.equal(validateWorkspace(w).evaluationHistory,undefined,'Old workspaces remain supported');
});
test('concurrent first history entries merge without overwriting reports or human plan edits',()=>{
  const {w,snapshot,report}=prepared();
  const local=retainEvaluation(w,report,snapshot,{},'2026-10-27T12:00:00Z',()=> 'local').workspace;
  const remote=retainEvaluation(w,report,snapshot,{},'2026-10-27T13:00:00Z',()=> 'remote').workspace;remote.plans[0].theme='Human change';
  const merged=validateWorkspace(mergeWorkspaces(w,local,remote));assert.equal(merged.evaluationHistory.length,2);assert.equal(merged.plans[0].theme,'Human change');
});
test('invalid saved reports and repetition overrides cannot enter a workspace backup',()=>{
  const {w,snapshot,report}=prepared(),entry=retainEvaluation(w,report,snapshot,{},'2026-10-27T12:00:00Z',()=> 'saved').entry;
  for(const mutate of [p=>p.report.recommendations=['a'],p=>p.snapshot.scopes[0].notes='excluded',p=>p.repeats={unknown:3},p=>p.snapshot.songs[0].words='private']){
    const copy=structuredClone(entry),payload=JSON.parse(copy.data);mutate(payload);copy.data=JSON.stringify(payload);assert.throws(()=>validateEvaluationHistory([copy]));
  }
});
test('new songs created in the plan picker are unrated records and valid without library membership',()=>{
  const w=fixture(),song=newPlanSong({title:'New human song',author:'Writer',version:'My arrangement',key:'C',minutes:'3.5'},()=> 'new-song');
  w.songs.push(song);w.plans[0].items.push({id:'new-item',type:'song',songId:song.id,minutes:3.5,key:'C',role:'',notes:''});
  const checked=validateWorkspace(w);assert.equal(checked.songs.at(-1).review.status,'unreviewed');assert.deepEqual(Object.values(song.review.scores),[null,null,null,null]);assert.ok(!w.libraries.some(l=>l.songIds.includes(song.id)));assert.throws(()=>newPlanSong({title:'  '}));
});
