import test from 'node:test';
import assert from 'node:assert/strict';
import {seedSongs} from '../public/seeds.js';
import {defaultProfile} from '../public/core.js';
import {evaluationSnapshot,workspaceEvaluationPrompt,parseWorkspaceEvaluation,evaluationToken} from '../public/workspace-evaluation.js';
import {evaluationContent} from '../public/evaluation-content.js';
import {sortEvaluationIdeas} from '../public/evaluation-assessments.js';
import {retainEvaluation,decodeEvaluation} from '../public/evaluation-history.js';
import {validateWorkspace} from '../public/backup.js';
function fixture(){
  const songs=structuredClone(seedSongs.slice(0,2));
  const workspace={version:1,profile:{...structuredClone(defaultProfile),aiMode:'full'},songs,
    libraries:[{id:'l',name:'Existing library',songIds:[songs[0].id]}],plans:[{id:'p',title:'Existing plan',date:'',theme:'',passage:'1 Peter 5:5-11',items:songs.map((s,i)=>({id:'i'+i,type:'song',songId:s.id,key:'',minutes:4,notes:'',role:''}))}]};
  const options={planIds:['p'],libraryIds:['l'],criteria:['themes','context','sequence'],includeAssessments:true};
  const snapshot=evaluationSnapshot(workspace,options),prompt=workspaceEvaluationPrompt(workspace,options,'scored');
  const raw=JSON.parse(prompt.split('Response shape:\n')[1].split('\nSelected snapshot')[0]);
  raw.summary='Synthetic scoped evaluation.';
  for(const row of raw.songs){row.textStatus='complete';row.evidence='Synthetic complete source.';row.sections=[{id:'v',label:'Verse',lineCount:2,repetitions:null,repeatEvidence:'',evidence:'Both fixture lines express grace.',ideas:{themes:{grace:2}}}];}
  for(const row of raw.criteria){row.findings.forEach(f=>f.observation='Synthetic selected-scope observation.');row.coverage.explanation='Synthetic mixed-scope comparison.';}
  for(const row of raw.assessments)for(const key of ['scripture','theology','flow']){
    row[key].reason=key==='theology'?'No doctrinal conflict in the fixture; the gospel is represented through grace and Christ’s work.':'Synthetic reference-text judgment.';
    if(row[key].status!=='notApplicable')Object.assign(row[key],{status:'assessed',score:key==='theology'?8.5:7,evidenceSongIds:[songs[0].id]});
  }
  return {workspace,options,snapshot,prompt,raw};
}
test('three authorized scope scores preserve counts, evidence, applicability and immutable backup/history',()=>{
  const {workspace,snapshot,raw}=fixture(),before=structuredClone(workspace);
  const report=parseWorkspaceEvaluation(JSON.stringify(raw),snapshot,'scored');
  assert.equal(report.schema,'faithful-workspace-evaluation-v4');
  assert.equal(report.assessments.find(a=>a.scopeId==='plan:p').theology.score,8.5);
  assert.equal(report.assessments.find(a=>a.scopeId==='library:l').flow.status,'notApplicable');
  assert.equal(report.assessments.find(a=>a.scopeId==='library:l').scripture.score,null);
  const old=structuredClone(raw);old.schema='faithful-workspace-evaluation-v3';delete old.assessments;
  const noScores=structuredClone(snapshot);delete noScores.includeAssessments;
  assert.deepEqual(evaluationContent(report,snapshot),evaluationContent(parseWorkspaceEvaluation(JSON.stringify(old),noScores,'scored'),noScores));
  const saved=validateWorkspace(retainEvaluation(workspace,report,snapshot,{},'2026-10-27T12:00:00Z',()=> 'scored-history').workspace);
  assert.equal(saved.evaluationSchema,4);assert.equal(saved.evaluationClient,4);
  assert.deepEqual(decodeEvaluation(saved.evaluationHistory[0]).report,report);
  assert.deepEqual(workspace,before);
});
test('scores reject out-of-range values, invented evidence, unrequested grades and false applicability',()=>{
  const {snapshot,raw}=fixture(),plan=raw.assessments.findIndex(a=>a.scopeId==='plan:p'),lib=raw.assessments.findIndex(a=>a.scopeId==='library:l');
  for(const mutate of [r=>r.assessments[plan].theology.score=11,r=>r.assessments[plan].theology.score=-1,r=>r.assessments[plan].theology.score=8.25,r=>r.assessments[plan].theology.score='8',r=>r.assessments[plan].theology.reason='',r=>r.assessments[plan].theology.evidenceSongIds=[],r=>r.assessments[plan].theology.evidenceSongIds=['invented'],r=>r.assessments[lib].theology.evidenceSongIds=[snapshot.songs[1].id],r=>r.assessments[lib].flow.score=0,r=>r.assessments.push(r.assessments[0]),r=>r.assessments[plan].overall=9,r=>r.songs[0].textStatus='unverified']){
    const value=structuredClone(raw);mutate(value);assert.throws(()=>parseWorkspaceEvaluation(JSON.stringify(value),snapshot,'scored'));
  }
  const zero=structuredClone(raw);zero.assessments[plan].theology.score=0;assert.equal(parseWorkspaceEvaluation(JSON.stringify(zero),snapshot,'scored').assessments[plan].theology.score,0);
  const unknown=structuredClone(raw);Object.assign(unknown.assessments[plan].theology,{status:'insufficientEvidence',score:null,evidenceSongIds:[]});assert.equal(parseWorkspaceEvaluation(JSON.stringify(unknown),snapshot,'scored').assessments[plan].theology.score,null);
  const unrequested=structuredClone(snapshot);delete unrequested.includeAssessments;assert.throws(()=>parseWorkspaceEvaluation(JSON.stringify(raw),unrequested,'scored'),/disagree/);
});
test('relevance orders emphasis then coverage, keeps unknown values last, and never changes original ordering',()=>{
  const ideas=[{category:'brief',criterionId:'themes',percent:2,songCount:1},{category:'common',criterionId:'themes',percent:60,songCount:2},{category:'unknown',criterionId:'themes',percent:null,songCount:4},{category:'shared',criterionId:'themes',percent:60,songCount:3}],before=structuredClone(ideas);
  assert.deepEqual(sortEvaluationIdeas(ideas,'most').map(i=>i.category),['shared','common','brief','unknown']);
  assert.deepEqual(sortEvaluationIdeas(ideas,'least').map(i=>i.category),['brief','common','shared','unknown']);
  assert.deepEqual(sortEvaluationIdeas(ideas,'alpha').map(i=>i.category),['brief','common','shared','unknown']);
  assert.deepEqual(sortEvaluationIdeas(ideas,'criterion'),ideas);assert.deepEqual(ideas,before);
});
test('assessment opt-in is request-bound and retains concise compact requests without unselected musical data',()=>{
  const {workspace,options,snapshot,prompt}=fixture();
  assert.equal(snapshot.includeAssessments,true);assert.match(prompt,/faithful-workspace-evaluation-v4/);assert.match(prompt,/three separate 0–10/);assert.match(prompt,/Stop researching a song once/);
  assert.notEqual(evaluationToken(workspace,options),evaluationToken(workspace,{...options,includeAssessments:false}));
  assert.equal('tempo' in snapshot.songs[0],false);assert.equal('minutes' in snapshot.scopes.find(s=>s.type==='plan').items[0],false);
});
