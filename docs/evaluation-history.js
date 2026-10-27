import {parseWorkspaceEvaluation,evaluationCriteria} from './workspace-evaluation.js';
import {contentCohorts,repeatKey} from './evaluation-content.js';

const fail=message=>{throw new Error(message);};
const bytes=value=>new TextEncoder().encode(value).length;
const object=(value,allowed)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail('Invalid evaluation history fields.');
  return value;
};
const str=(v,max=1500)=>typeof v==='string'&&v.length<=max?v:fail('Invalid evaluation history text.');
const id=v=>str(v,200).trim()||fail('Missing evaluation history ID.');
const list=(v,max)=>Array.isArray(v)&&v.length<=max?v:fail('Invalid evaluation history list.');
const unique=rows=>{if(new Set(rows.map(v=>v.id)).size!==rows.length)fail('Duplicate evaluation history ID.');return rows;};
function savedSnapshot(input) {
  object(input,['scopes','songs','criteria','purpose','includeWords','includeAssessments','lens']);
  if(input.includeAssessments!==undefined&&typeof input.includeAssessments!=='boolean')fail('Invalid archived assessment selection.');
  const songs=unique(list(input.songs,5000).map(song=>{
    object(song,['id','title','artist','version','tempo','key','lowNote','highNote']);
    const copy={id:id(song.id),title:str(song.title,200),artist:str(song.artist||'',300),version:str(song.version||'',300)};
    for(const key of ['tempo','key','lowNote','highNote'])if(song[key]!==undefined)copy[key]=song[key];
    return copy;
  }));
  const songIds=new Set(songs.map(s=>s.id));
  const scopes=unique(list(input.scopes,1000).map(scope=>{
    object(scope,['id','type','name','songIds','items','theme','passage']);
    const copy={id:id(scope.id),type:scope.type,name:str(scope.name,200)};
    if(!['plan','library'].includes(scope.type)||!scope.id.startsWith(scope.type+':'))fail('Invalid archived scope.');
    if(scope.type==='library'){
      copy.songIds=list(scope.songIds,5000).map(id);
      if(new Set(copy.songIds).size!==copy.songIds.length||copy.songIds.some(s=>!songIds.has(s)))fail('Invalid archived library membership.');
    }else{
      copy.theme=str(scope.theme||'',500);copy.passage=str(scope.passage||'',200);
      copy.items=unique(list(scope.items,1000).map(item=>{
        object(item,['id','type','title','role','songId','unavailable','minutes','key','arrangementName','tempo','lowNote','highNote']);
        if(!['song','other','heading','reading'].includes(item.type))fail('Invalid archived plan item.');
        const row={...item,id:id(item.id)};
        if(item.type==='song'&&!item.unavailable&&!songIds.has(item.songId))fail('Archived plan references missing evidence.');
        return row;
      }));
    }
    return copy;
  }));
  const criteria=unique(list(input.criteria,30).map(c=>{
    object(c,['id','label','question']);id(c.id);
    if(!evaluationCriteria.some(v=>v.id===c.id)&&!/^custom-[1-6]$/.test(c.id))fail('Invalid archived criterion.');
    return {id:c.id,label:str(c.label,200),question:str(c.question,1500)};
  }));
  if(!criteria.length||!scopes.length)fail('Archived reports need criteria and scopes.');
  const lens=object(input.lens||{},['id','name','purpose','principles','weights','criteria']);
  const snapshot={scopes,songs,criteria,purpose:str(input.purpose||'',2000),includeWords:input.includeWords===true,
    ...(input.includeAssessments===true?{includeAssessments:true}:{}),
    lens:{id:id(lens.id||'main'),name:str(lens.name||'Main lens',100),purpose:str(lens.purpose||'',2000),principles:str(lens.principles||'',6000)}};
  // Numeric/string measurements are only ever rendered as data. Reject nested
  // objects, nonfinite values and unexpected payloads before retaining them.
  for(const row of [...songs,...scopes.flatMap(s=>s.items||[])]){
    for(const key of ['tempo','minutes'])if(row[key]!==undefined&&row[key]!==null&&(!Number.isFinite(row[key])||row[key]<0||row[key]>1000))fail('Invalid archived measurement.');
    for(const key of ['title','role','key','arrangementName','lowNote','highNote'])if(row[key]!==undefined)str(row[key],500);
    if(row.unavailable!==undefined&&typeof row.unavailable!=='boolean')fail('Invalid archived availability.');
  }
  return snapshot;
}
export function decodeEvaluation(entry) {
  object(entry,['id','createdAt','data']);id(entry.id);str(entry.createdAt,100);
  if(!Number.isFinite(Date.parse(entry.createdAt)))fail('Invalid evaluation date.');
  str(entry.data,1000000);
  let input;try{input=JSON.parse(entry.data);}catch{fail('Invalid saved evaluation JSON.');}
  object(input,['report','snapshot','repeats']);
  const snapshot=savedSnapshot(input.snapshot),report=parseWorkspaceEvaluation(JSON.stringify(input.report),snapshot,input.report?.requestId);
  const allowed=new Set(contentCohorts(snapshot).flatMap(scope=>scope.entries.flatMap(item=>(report.songs.find(s=>s.id===item.id)?.sections||[]).map(section=>repeatKey(item.originScope||scope.id,item.itemId,section.id)))));
  const repeats=input.repeats||{};
  if(!repeats||typeof repeats!=='object'||Array.isArray(repeats)||Object.keys(repeats).length>20000)fail('Invalid saved repetition pattern.');
  for(const [key,value] of Object.entries(repeats))if(!allowed.has(key)||!Number.isInteger(value)||value<0||value>50)fail('Invalid saved repetition count.');
  return {report,snapshot,repeats:{...repeats}};
}
export function validateEvaluationHistory(input) {
  const entries=unique(list(input,100));
  if(bytes(JSON.stringify(entries))>2*1024*1024)fail('Evaluation History exceeds its 2 MB limit. Download or remove older reports first.');
  return entries.map(entry=>{
    const decoded=decodeEvaluation(entry);
    return {id:entry.id,createdAt:entry.createdAt,data:JSON.stringify(decoded)};
  });
}
export function retainEvaluation(workspace,report,snapshot,repeats={},now=new Date().toISOString(),newId=()=>crypto.randomUUID()) {
  const safe=structuredClone(snapshot);safe.songs.forEach(song=>delete song.words);
  const entry={id:newId(),createdAt:now,data:JSON.stringify({report,snapshot:safe,repeats})};
  const checked=validateEvaluationHistory([entry])[0];
  const current=workspace.evaluationHistory||[];
  if(current.some(row=>row.data===checked.data))return {workspace,entry:current.find(row=>row.data===checked.data),duplicate:true};
  if(current.length>=100)fail('Evaluation History has 100 reports. Download or remove older reports before saving another.');
  const next={...workspace,evaluationHistory:validateEvaluationHistory([...current,checked])};
  if(bytes(JSON.stringify(next))>5*1024*1024)fail('This report would make your workspace backup too large. Download the evaluation or remove older saved reports first.');
  return {workspace:next,entry:checked,duplicate:false};
}
