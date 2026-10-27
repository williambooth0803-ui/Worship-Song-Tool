import {auditAxes,auditLabels} from './library-audit.js';

export const textAxes = Object.fromEntries(Object.entries(auditAxes).map(([id,axis])=>[id,{
  label:axis.label,categories:[...axis.categories.filter(c=>!['mixed','unknown','instrumental'].includes(c)),...(id==='mood'?['reverence']:[])],
}]));
export const ideaLabel = category => auditLabels[category] || (category==='reverence'?'Reverence':category);
export const repeatKey = (scope,item,section) => JSON.stringify([scope,item,section]);
const fail=message=>{throw new Error(message);};
const text=(value,label,max=1500)=>typeof value==='string'&&value.trim()&&value.length<=max?value:fail(`${label} must be nonempty text of at most ${max} characters.`);
const keys=(row,allowed)=>{if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!allowed.includes(k)))fail('Unsupported lyrical evidence fields; scores and edits are not accepted.');};
const integer=(n,min,max,label)=>Number.isInteger(n)&&n>=min&&n<=max?n:fail(`Invalid ${label}.`);
// V3 groups category counts and explains the evidence once per section.
// Accepted wire responses normalize to v2 for existing history clients.
export function sectionIdeas(section) {
  if(Array.isArray(section.ideas))return section.ideas;
  if(!section.ideas||typeof section.ideas!=='object')fail('Invalid section idea groups.');
  return Object.entries(section.ideas).flatMap(([criterionId,categories])=>{
    if(!categories||typeof categories!=='object'||Array.isArray(categories))fail('Invalid section category counts.');
    return Object.entries(categories).map(([category,lineCount])=>({criterionId,category,lineCount,evidence:section.evidence}));
  });
}
export function contentSources(sources) {
  if(!Array.isArray(sources)||sources.length>8)fail('Use at most eight sources per song.');
  return sources.map(source=>{
    keys(source,['label','url']);text(source.label,'Source label',300);text(source.url,'Source URL',2000);
    let url;try{url=new URL(source.url);}catch{fail('Sources must use public HTTPS URLs.');}
    if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||url.hostname.includes(':')||/^\d+(\.\d+){3}$/.test(url.hostname)||/\.(local|internal|localhost)$/.test(url.hostname))fail('Sources must use public HTTPS URLs.');
    return {label:source.label,url:source.url};
  });
}
export function parseContentSong(row,snapshot,compact=false) {
  keys(row,['id','textStatus','sections','evidence','sources']);
  if(!['complete','partial','unverified'].includes(row.textStatus))fail('Invalid text review status.');
  text(row.evidence,'Song evidence');
  if(!Array.isArray(row.sections)||row.sections.length>40)fail('Use at most forty lyrical sections per song.');
  if(row.textStatus==='unverified'&&row.sections.length)fail('Unverified words cannot supply lyrical measurements.');
  if(row.textStatus!=='unverified'&&!row.sections.length)fail('Reviewed words need section evidence.');
  const seen=new Set(),selected=new Set(snapshot.criteria.map(c=>c.id)),unmappedEvidence=[];
  const sections=row.sections.map(section=>{
    keys(section,['id','label','lineCount','repetitions','repeatEvidence','ideas',...(compact?['evidence']:[])]);
    text(section.id,'Section ID',100);text(section.label,'Section label',100);
    if(seen.has(section.id))fail('Duplicate lyrical section.');seen.add(section.id);
    integer(section.lineCount,1,1000,'lyrical line count');
    if(section.repetitions!==null){integer(section.repetitions,1,50,'repetition count');text(section.repeatEvidence,'Repetition evidence',500);}
    else if(typeof section.repeatEvidence!=='string'||section.repeatEvidence.length>500)fail('Invalid repetition evidence.');
    if(compact){
      text(section.evidence,'Section evidence',500);
      if(!section.ideas||typeof section.ideas!=='object'||Array.isArray(section.ideas))fail('Use grouped idea counts for a compact report.');
      if(Object.keys(section.ideas).some(id=>!selected.has(id)||(!Object.hasOwn(textAxes,id)&&id!=='themes')))fail('An idea group references an unselected textual criterion.');
    }else if(!Array.isArray(section.ideas))fail('Use an idea list for a v2 report.');
    const inputIdeas=sectionIdeas(section);
    if(inputIdeas.length>50)fail('Use at most fifty ideas per section.');
    const combinations=new Set();
    const ideas=inputIdeas.map(idea=>{
      keys(idea,['criterionId','category','lineCount','evidence']);
      if(!selected.has(idea.criterionId)||(!textAxes[idea.criterionId]&&idea.criterionId!=='themes'))fail('An idea references an unselected textual criterion.');
      text(idea.category,'Idea category',80);
      const category=idea.criterionId==='themes'?idea.category.trim().toLocaleLowerCase():idea.category;
      if(textAxes[idea.criterionId]&&!textAxes[idea.criterionId].categories.includes(category))fail('Invalid lyrical idea category.');
      const key=JSON.stringify([idea.criterionId,category]);if(combinations.has(key))fail('Duplicate idea in a lyrical section.');combinations.add(key);
      integer(idea.lineCount,1,section.lineCount,'idea line count');text(idea.evidence,'Idea evidence',500);
      return {...idea,category};
    });
    if(compact&&!ideas.length)unmappedEvidence.push(`${section.label}: ${section.evidence}`);
    const {evidence,...fields}=section;
    return {...fields,ideas};
  });
  const evidence=[row.evidence,...unmappedEvidence].join('\n');
  text(evidence,'Combined song evidence');
  return {id:row.id,textStatus:row.textStatus,sections,evidence,sources:contentSources(row.sources)};
}
export function contentInstructions(criteria) {
  const selected=criteria.map(c=>c.id);
  return `Focus on song WORDS. Do not discuss missing tempo, key, range, arrangement, duration or instrumental information unless the user explicitly selected a relevant musical criterion. Describe lyrical transitions only for sequence. Keep limitations concise and relevant, not a checklist of unrequested metadata.
Use overlapping, section-level ideas rather than one dominant category for a whole song. Selected categories: ${JSON.stringify(Object.fromEntries(Object.entries(textAxes).filter(([id])=>selected.includes(id)).map(([id,a])=>[id,a.categories])))}. ${selected.includes('themes')?'For themes, use concise consistent lower-case topic labels across songs; include any evidenced idea, even a single line.':''}
For every song, textStatus is complete only when the entire reference lyric text was reviewed, partial for an excerpt, and unverified when words cannot be established. Unverified songs have sections: []. Source identity must match the selected song. Exact local edits remain a relevant limitation, not a reason to repeat disclaimers throughout a report.
For reviewed words, list distinct lyrical sections, each with a stable id, label, lineCount, repetitions, repeatEvidence, evidence and ideas. Count lyric lines consistently, excluding headings/chords/stage directions. Give each section ONE concise original evidence explanation (one or two sentences, at most 500 characters) supporting its categories and counts. Do not repeat an explanation for each category. Use no more than 10 quoted lyric words per song across the report. In v3, ideas is a grouped count object, for example {"themes":{"grace":2},"function":{"confession":1},"voice":{"individual":4}}. Include only selected textual criterion IDs; omit groups without evidenced categories. Values are positive integer line counts, not scores. A line may express several ideas; each category's count cannot exceed its section's lineCount. No mixed/unknown bucket is needed. Missing evidence is represented by textStatus, not invented measurements. Use at most 60 consistent theme labels across the report. An empty ideas object is allowed when no selected textual category applies.
Record repetitions only when the published source explicitly specifies repeated sections; otherwise null with repeatEvidence: "". Never assume choruses or bridges repeat a standard number of times, or transfer a recording's pattern to the user's performance. Count separately printed repetitions either through repetitions or expanded sections, never both. The preview uses each unmarked section once and lets the user adjust plan occurrence repetitions. References to chorus/bridge repetition must distinguish source evidence from actual performance.
Coverage and emphasis are separate: one clear line can establish an idea's presence without making it dominant. Do not infer adequacy or deficiency from a percentage, impose equal proportions, or treat overlapping idea percentages as parts that must sum to 100. Use findings to explain the substance and context of the coverage; numerical lyric proportions are descriptive measurements, never quality scores.`;
}

export function contentCohorts(snapshot) {
  const songMap=new Map(snapshot.songs.map(s=>[s.id,s]));
  const cohorts=snapshot.scopes.map(scope=>({...scope,entries:scope.type==='library'
    ?scope.songIds.map(id=>({id,itemId:id}))
    :scope.items.filter(i=>i.type==='song').map(i=>({...i,id:i.songId,itemId:i.id,originScope:scope.id}))}));
  const libraries=cohorts.filter(s=>s.type==='library'),plans=cohorts.filter(s=>s.type==='plan');
  if(libraries.length>1)cohorts.push({id:'library-union',name:'Combined libraries · distinct songs',type:'library',entries:[...new Set(libraries.flatMap(s=>s.entries.map(e=>e.id)))].map(id=>({id,itemId:id}))});
  if(plans.length>1)cohorts.push({id:'plan-combined',name:'Combined plans · song occurrences',type:'plan',entries:plans.flatMap(p=>p.entries),items:plans.flatMap(p=>p.items)});
  return cohorts.map(scope=>({...scope,entries:scope.entries.map(entry=>({...entry,title:songMap.get(entry.id)?.title||'Unavailable song'}))}));
}
export function evaluationContent(report,snapshot,repeats={}) {
  const rows=new Map(report.songs.map(s=>[s.id,s]));
  return contentCohorts(snapshot).map(scope=>{
    const categories=new Map();let totalLines=0,reviewed=0,partial=0,unavailable=0;
    const cells=scope.entries.map(entry=>{
      const song=rows.get(entry.id),ideas=new Map();let lines=0;
      if(!song)unavailable++;
      if(song?.sections){
        if(song.textStatus!=='unverified')reviewed++;
        if(song.textStatus==='partial')partial++;
        for(const section of song.sections){
          const count=repeats[repeatKey(entry.originScope||scope.id,entry.itemId,section.id)]??section.repetitions??1;
          lines+=section.lineCount*count;
          for(const idea of sectionIdeas(section)){
            const key=JSON.stringify([idea.criterionId,idea.category]);
            if(count>0){categories.set(key,{criterionId:idea.criterionId,category:idea.category});ideas.set(key,(ideas.get(key)||0)+idea.lineCount*count);}
          }
        }
      }else if(song){ // Old reports retain presence evidence, never invented proportions.
        for(const id of Object.keys(textAxes))for(const category of Array.isArray(song[id])?song[id]:[song[id]])
          if(category&& !['unknown','mixed','instrumental'].includes(category)){const key=JSON.stringify([id,category]);categories.set(key,{criterionId:id,category});ideas.set(key,null);}
      }
      totalLines+=lines;
      return {...entry,textStatus:song?.textStatus||'legacy',lines,ideas};
    });
    const ideas=[...categories].map(([key,idea])=>{
      const found=cells.filter(c=>c.ideas.has(key)),weightedLines=found.reduce((sum,c)=>sum+(c.ideas.get(key)||0),0);
      return {...idea,key,songCount:new Set(found.map(c=>c.id)).size,occurrenceCount:found.length,weightedLines,
        percent:totalLines?100*weightedLines/totalLines:null,
        cells:cells.map(c=>({present:c.ideas.has(key),percent:c.lines?100*(c.ideas.get(key)||0)/c.lines:null,status:c.textStatus}))};
    }).sort((a,b)=>snapshot.criteria.findIndex(c=>c.id===a.criterionId)-snapshot.criteria.findIndex(c=>c.id===b.criterionId)||a.category.localeCompare(b.category));
    return {id:scope.id,name:scope.name,type:scope.type,total:cells.length,distinctSongs:new Set(cells.filter(c=>c.id).map(c=>c.id)).size,
      reviewed,partial,reviewedSongs:new Set(cells.filter(c=>['complete','partial'].includes(c.textStatus)).map(c=>c.id)).size,partialSongs:new Set(cells.filter(c=>c.textStatus==='partial').map(c=>c.id)).size,unavailable,totalLines,entries:cells.map(({ideas,...entry})=>entry),ideas,
      minutes:snapshot.criteria.some(c=>c.id==='tempo')&&scope.type==='plan'?scope.items.reduce((sum,i)=>sum+(i.minutes||0),0):null};
  });
}
