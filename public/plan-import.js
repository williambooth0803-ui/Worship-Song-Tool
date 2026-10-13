import { normalize } from './core.js';
import { visibleSongs } from './song-state.js';
export const PLAN_IMPORT_SCHEMA='faithful-plan-v1';
const text=(value,label,max=6000)=>{if(typeof value!=='string'||value.length>max)throw new Error(`${label} must be text of up to ${max} characters.`);return value.trim();};
const titleKey=value=>normalize(value).replace(/[^\p{L}\p{N}]/gu,'');
const artistKey=value=>titleKey(value.replace(/^Associated recording:\s*/i,''));
export function planImportPrompt(workspace) {
 const ids=new Set(workspace.libraries.flatMap(l=>l.songIds));
 const songs=visibleSongs(workspace.songs).filter(s=>ids.has(s.id));
 return `Transcribe the existing human-planned service order in my attached screenshot/PDF into JSON. Do not propose songs, invent durations or fill unreadable details. Preserve all headings, readings, announcements, prayers, sermon and song order, notes and explicit timings. Use null for missing minutes. List uncertainty whenever text, date, song version, artist or duration is unclear. Do not infer certainty from a familiar title. Match songs only to the IDs below when both title and recording/attribution identify the exact version; otherwise use songId:null and supply the original title/artist. Return only JSON, no executable code.\nSchema: ${JSON.stringify({schema:PLAN_IMPORT_SCHEMA,title:'Name from source',date:'YYYY-MM-DD or empty',theme:'',passage:'',source:'Source document label',uncertainties:[],items:[{type:'heading',title:'Gathering',minutes:0,notes:'',uncertainty:''},{type:'song',title:'Exact song title',artist:'Exact artist / attribution',songId:null,key:'',minutes:null,notes:'',uncertainty:'Duration missing'},{type:'other',title:'Scripture reading',minutes:null,notes:'Reading text if supplied',uncertainty:'Duration missing'}]})}\nMy library song identities (no lyrics, song notes, ratings or credentials):\n${JSON.stringify(songs.map(s=>({songId:s.id,title:s.title,artist:s.author,version:s.version})))}`;
}
export function inspectPlanImport(value,songs) {
 if(typeof value==='string') {if(value.length>256000)throw new Error('Plan JSON must be smaller than 256 KB.');try{value=JSON.parse(value);}catch{throw new Error('Paste valid plan JSON, not a screenshot, PDF or executable code.');}}
 if(!value||value.schema!==PLAN_IMPORT_SCHEMA||!Array.isArray(value.items)||!value.items.length||value.items.length>1000)throw new Error('Use faithful-plan-v1 JSON with 1–1,000 items.');
 const date=text(value.date??'','Plan date',10);
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw new Error('Use a real calendar date in YYYY-MM-DD format.');
 const title=text(value.title,'Plan title',200);if(!title)throw new Error('A plan title is required.');
 const uncertainties=value.uncertainties??[];if(!Array.isArray(uncertainties)||uncertainties.length>100)throw new Error('Invalid uncertainty list.');
 const pool=visibleSongs(songs);
 const rows=value.items.map((row,index)=>{
  if(!row||!['song','other','heading'].includes(row.type))throw new Error(`Item ${index+1} has an unsupported type.`);
  const name=text(row.title,`Item ${index+1} title`,200);if(!name)throw new Error(`Item ${index+1} needs a title.`);
  const artist=text(row.artist??'','Artist',1000),issues=[];
  const uncertainty=text(row.uncertainty??'','Item uncertainty',2000);if(uncertainty)issues.push(uncertainty);
  const minutes=row.type==='heading'?0:row.minutes;
  if(row.type!=='heading'&&(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<.5||minutes>180))issues.push('Confirm the duration in minutes.');
  const candidates=row.type==='song'?pool.filter(s=>titleKey(s.title)===titleKey(name)&&(!artist||artistKey(s.author)===artistKey(artist))):[];
  let song=row.type==='song'&&typeof row.songId==='string'?pool.find(s=>s.id===row.songId):null;
  if(row.type==='song') {
   if(song&&(titleKey(song.title)!==titleKey(name)||(artist&&artistKey(song.author)!==artistKey(artist)))){issues.push('The supplied song ID does not match the source title/artist.');song=null;}
   if(!song&&candidates.length===1&&artist)song=candidates[0];
   if(!song)issues.push(candidates.length>1?'Choose the exact song version.':'Choose a library song or keep this as a text item.');
   if(!artist&&!row.songId)issues.push('The source does not identify a recording or attribution.');
  }
  return {index,type:row.type,title:name,artist,songId:song?.id??null,key:text(row.key??'','Key',100),role:text(row.role??'','Item label',100),minutes,notes:text(row.notes??'','Item notes'),issues,candidates:candidates.map(s=>s.id)};
 });
 return {title,date,theme:text(value.theme??'','Theme',500),passage:text(value.passage??'','Passage',200),source:text(value.source??'','Source',200),uncertainties:uncertainties.map(v=>text(v,'Uncertainty',2000)),rows,needsReview:uncertainties.length>0||rows.some(r=>r.issues.length)};
}
export function importedPlan(draft,songs,resolutions={},confirmed=false,newId=()=>crypto.randomUUID()) {
 if(draft.needsReview&&!confirmed)throw new Error('Review the uncertain interpretation before importing.');
 const pool=visibleSongs(songs);
 const items=draft.rows.map(row=>{
  const changes=resolutions[row.index]||{},id=changes.songId===undefined?row.songId:changes.songId;
  const type=row.type==='song'&&id==='__text__'?'other':row.type;
  const minutes=type==='heading'?0:changes.minutes===undefined?row.minutes:Number(changes.minutes);
  if(typeof minutes!=='number'||!Number.isFinite(minutes)||(type!=='heading'&&(minutes<.5||minutes>180)))throw new Error(`Confirm the duration for item ${row.index+1}.`);
  const item={id:newId(),type,minutes,role:row.role||'',notes:row.notes};
  if(type==='song') {const song=pool.find(s=>s.id===id);if(!song)throw new Error(`Choose a visible song for item ${row.index+1}.`);return {...item,songId:song.id,key:row.key};}
  return {...item,title:row.title};
 });
 return {id:newId(),title:draft.title,date:draft.date,theme:draft.theme,passage:draft.passage,status:'draft',items,importSource:{label:draft.source,importedAt:new Date().toISOString(),uncertaintyReviewed:confirmed,schema:PLAN_IMPORT_SCHEMA}};
}
export function exportPlanJSON(plan,songs) {
 return {schema:PLAN_IMPORT_SCHEMA,title:plan.title,date:plan.date,theme:plan.theme,passage:plan.passage,source:'Faithful Repertoire export',uncertainties:[],items:plan.items.map(item=>{const song=songs.find(s=>s.id===item.songId);return {type:item.type,title:song?.title||item.title,artist:song?.author||'',songId:song?.id??null,key:item.key||'',role:item.role||'',minutes:item.minutes,notes:item.notes||'',uncertainty:''};})};
}
