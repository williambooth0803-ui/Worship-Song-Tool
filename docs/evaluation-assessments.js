export const assessmentDefinitions=[
  {id:'scripture',label:'Scripture relevance',rubric:'0–2: absent or contrary connection; 3–5: limited thematic overlap; 6–8: substantial contextual alignment; 9–10: central ideas closely expressed in their biblical sense.'},
  {id:'theology',label:'Theological soundness & gospel',rubric:'0–2: major doctrinal conflict; 3–5: significant confusion or very limited gospel coverage; 6–8: broadly sound with meaningful gospel substance; 9–10: clear, sound and coherent gospel coverage across the scope.'},
  {id:'flow',label:'Flow of ideas',rubric:'0–2: disconnected or contradictory progression; 3–5: understandable but loosely connected; 6–8: coherent development; 9–10: especially clear logical development across the recorded order.'},
];
const fail=message=>{throw new Error(message);};
const object=(v,allowed)=>{
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))fail('Unsupported assessment fields. Only the three requested scope assessments are accepted.');
};
const scopeIds=scope=>new Set(scope.type==='library'?scope.songIds:scope.items.filter(i=>i.type==='song'&&!i.unavailable).map(i=>i.songId));
export const assessmentApplicable=(id,scope)=>id==='scripture'?scope.type==='plan'&&!!scope.passage?.trim():id==='flow'?scope.type==='plan'&&scope.items.filter(i=>i.type!=='heading').length>=2:true;
export function assessmentTemplate(snapshot){
  return snapshot.scopes.map(scope=>({scopeId:scope.id,...Object.fromEntries(assessmentDefinitions.map(({id})=>[id,{status:assessmentApplicable(id,scope)?'insufficientEvidence':'notApplicable',score:null,reason:'',evidenceSongIds:[]}]))}));
}
export function assessmentInstructions(){
  return `Include exactly three separate 0–10 assessments for each selected scope: scripture, theology, flow. No overall/composite worship score, song ranking, recommendations or plan edits. Each assessment has status (assessed, insufficientEvidence, notApplicable), score, reason and evidenceSongIds. Use null, never 0, for an unassessed score. When assessed, use a number from 0 to 10 with at most one decimal and cite 1–3 representative reviewed song IDs from that scope. Keep each reason to one or two substantive sentences, at most 700 characters. Reassess the template placeholders from evidence; do not simply echo them.
Scripture: evaluate contextual relevance to the plan's recorded passage when supplied. Verify that passage once and reuse it across the report; thematic overlap is different from a quotation/allusion. No recorded passage means notApplicable. Theology: jointly evaluate doctrinal soundness against the selected lens AND gospel substance across the whole scope. Explicitly distinguish errors from omissions and describe gospel coverage in the reason: sin/need, Christ's identity, atoning death, bodily resurrection, grace and faith. Do not require every individual song to restate the whole gospel. Flow: evaluate the logical lyrical progression of the existing order, not musical transitions; libraries and plans with fewer than two non-heading items are notApplicable. Missing or unverified lyric evidence means insufficientEvidence when it cannot support a rating; never turn unknowns into low scores. Do not infer any grade from a theme percentage, repetition count, popularity or artist association.
Anchors: ${assessmentDefinitions.map(d=>d.label+': '+d.rubric).join(' ')} These are separate AI judgments under the selected lens, not approval decisions.`;
}
export function parseAssessments(input,snapshot,songs){
  if(!Array.isArray(input)||input.length!==snapshot.scopes.length)fail('Include assessments for every selected scope exactly once.');
  const seen=new Set(),reviewed=new Set(songs.filter(s=>s.textStatus!=='unverified'&&s.sections?.length).map(s=>s.id));
  return input.map(row=>{
    object(row,['scopeId',...assessmentDefinitions.map(d=>d.id)]);
    const scope=snapshot.scopes.find(s=>s.id===row.scopeId);
    if(!scope||seen.has(row.scopeId))fail('Unknown or duplicate assessment scope.');seen.add(row.scopeId);
    const allowed=scopeIds(scope),result={scopeId:row.scopeId};
    for(const {id} of assessmentDefinitions){
      const value=row[id];object(value,['status','score','reason','evidenceSongIds']);
      if(!['assessed','insufficientEvidence','notApplicable'].includes(value.status))fail('Invalid assessment status.');
      if(typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>700)fail('Each assessment needs a concise supporting reason.');
      if(!Array.isArray(value.evidenceSongIds)||value.evidenceSongIds.length>10||new Set(value.evidenceSongIds).size!==value.evidenceSongIds.length||value.evidenceSongIds.some(s=>!allowed.has(s)||!reviewed.has(s)))fail('Assessment evidence must cite reviewed songs in its own scope.');
      const applicable=assessmentApplicable(id,scope);
      if(!applicable&&value.status!=='notApplicable'||applicable&&value.status==='notApplicable')fail('Assessment applicability does not match the recorded passage or scope order.');
      if(value.status==='assessed'){
        if(!Number.isFinite(value.score)||value.score<0||value.score>10||Math.abs(value.score*10-Math.round(value.score*10))>1e-8||!value.evidenceSongIds.length)fail('An assessed score needs a 0–10 value and reviewed evidence.');
      }else if(value.score!==null)fail('Unassessed scores must be null, not zero.');
      result[id]={status:value.status,score:value.score,reason:value.reason,evidenceSongIds:[...value.evidenceSongIds]};
    }
    return result;
  });
}

export function sortEvaluationIdeas(ideas,order='most'){
  const rows=[...ideas];
  if(order==='criterion')return rows;
  if(order==='alpha')return rows.sort((a,b)=>a.category.localeCompare(b.category)||a.criterionId.localeCompare(b.criterionId));
  const direction=order==='least'?1:-1;
  return rows.sort((a,b)=>{
    if((a.percent===null)!==(b.percent===null))return a.percent===null?1:-1;
    return direction*((a.percent??0)-(b.percent??0))||direction*(a.songCount-b.songCount)||a.category.localeCompare(b.category)||a.criterionId.localeCompare(b.criterionId);
  });
}
