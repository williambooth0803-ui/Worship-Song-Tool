import {validateLyricExcerpt} from "../public/catalog-analysis.js";
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {baseCatalogSongs as allCatalogSongs} from '../public/catalog.js';
import {catalogAnalysisData as previousData} from '../public/catalog-analysis-data.js';
import {retainCatalogEvidence} from './catalog-analysis-retention.mjs';

const [corpusFile,bibleFile,outputDirectory]=process.argv.slice(2);
if(!corpusFile||!bibleFile)throw new Error('Provide the public-text corpus JSON and public-domain KJV JSON. No personal workspace is accepted.');
const corpus=JSON.parse(await readFile(corpusFile,'utf8')),bible=JSON.parse(await readFile(bibleFile,'utf8'));
const norm=s=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const hash=s=>createHash('sha256').update(s).digest('hex');
const checkedAt=corpus.checkedAt || new Date().toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt))throw new Error('Supply an ISO research date.');
const bibleHash=hash(await readFile(bibleFile,'utf8'));
const previousManifest=JSON.parse(await readFile(new URL('../data/catalog-analysis/coverage.json',import.meta.url),'utf8'));
if(corpus.partial && bibleHash!==previousData.scriptureSource.hash)throw new Error('Incremental research must retain the same checked Scripture transcription.');
const inputRecords=new Map();
for(const record of corpus.records){
 const identity=allCatalogSongs.find(song=>song.id===record.id);
 if(!identity||identity.title!==record.title||identity.author!==record.author||inputRecords.has(record.id))throw new Error('Corpus/catalog identity mismatch '+record.id);
 inputRecords.set(record.id,record);
}
const noteRows=(await readFile(new URL('../data/catalog-reviewed-notes.tsv',import.meta.url),'utf8')).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const [title,accuracy,substance,language,themes,references,quote,concern,newScores]=l.split('|');return [norm(title),{title,accuracy,substance,language,themes:themes.split(';'),references:references.split(';'),quote,concern,newScores:newScores?newScores.split(',').map(Number):null}];});
const reviewed=new Map(noteRows);
if(reviewed.size!==noteRows.length)throw new Error('Duplicate authored note keys: replace superseded notes rather than shadowing them.');
const bookNames=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
function scripture(reference,theme){
 const match=/^(.+) (\d+):(\d+)$/.exec(reference);if(!match)throw new Error('Invalid reference '+reference);
 const index=bookNames.indexOf(match[1]),verse=bible[index]?.chapters[Number(match[2])-1]?.[Number(match[3])-1];
 if(!verse)throw new Error('Verse unavailable '+reference);
 const quote=verse;
 if(!norm(verse).includes(norm(quote)))throw new Error('Inexact Scripture excerpt '+reference);
 return {reference,quote,relationship:'Supporting comparison',explanation:`Compare the passage in context with the lyric's treatment of ${theme.toLowerCase()}. This is a comparison for review, not a claim that the writer intended a verbal quotation.`,translation:'KJV'};
}
const topics=[['Cross',/\bcross\b|\bcrucifi/i],['Resurrection',/\brisen\b|\bresurrect|\brose again\b/i],['Forgiveness',/forgiv|pardon|cleans/i],['Sin',/\bsins?\b|\bsinners?\b/i],['Grace',/\bgrace\b/i],['Holy Spirit',/holy spirit|spirit of (?:the living )?god/i],['Fatherhood of God',/\bfather\b/i],['Praise',/\bpraise\b|\bworship\b/i],['Prayer',/\bpray\b|\bprayer\b/i],['Trust',/\btrust\b|\bfaith\b/i],['Guidance',/\bguide\b|\blead me\b/i],['Heaven',/\bheaven\b/i],['Light',/\blight\b/i]];
const sourceMap=new Map(corpus.sources.map(s=>[s.key,s]));
const records={},analyses={},manifest=[];
for(const song of allCatalogSongs){
 const r=inputRecords.get(song.id);
 if(!r && corpus.partial){
  const retained=retainCatalogEvidence(song,previousData,previousManifest.records.find(record=>record.id===song.id));
  records[song.id]=retained.record;
  if(retained.analysis){
   if(corpus.expandScriptureQuotes)retained.analysis.scriptures=retained.analysis.scriptures.map(s=>({...s,quote:scripture(s.reference,'').quote}));
   analyses[retained.record.analysisKey]=retained.analysis;
  }
  manifest.push(retained.coverage);
  continue;
 }
 if(!r||r.title!==song.title||r.author!==song.author)throw new Error('Corpus/catalog identity mismatch '+song.id);
 if(corpus.partial && (!r.sourceKeys?.length||!sourceMap.has(r.sourceKeys[0])))throw new Error('Incremental replacement needs an inspected source '+song.id);
 const source=sourceMap.get(r.sourceKeys[0]),notes=reviewed.get(norm(song.id))||reviewed.get(norm(song.title));
 const incomplete=r.partialText ?? (source?.complete===false || (source?.complete!==true && ['Unstoppable God','Most Beautiful / So in Love'].includes(song.title)));
 let status=source?incomplete?'partial-text':notes?'reviewed-draft':'text-scan':r.status==='title-only'?'identity-unresolved':'missing-text';
 let analysisKey=null;
 if(source){
  const sourceURL=new URL(source.url);
  if(sourceURL.protocol!=='https:'||sourceURL.username||sourceURL.password||!['github.com','integrityworship.com','cityalight.com','sovereigngracemusic.com','www.worshiptogether.com','www.mattpapa.com','www.stuarttownend.co.uk','www.jordankauflin.com','essentialworship.com','www.datocms-assets.com','bethelmusic.com','app.theworshipinitiative.com','hymnary.org','gettymusic.store','www.cifraclub.com.br','www.multitracks.com','digitalsongsandhymns.com','klrc.com','www.singhymnal.com','hillsong.com','www.shazam.com','sifalyrics.com','www.thousandtongues.org'].includes(sourceURL.hostname))throw new Error('Unsafe evidence source URL');
  // A revised rationale must not collide with an older retained cover report.
  analysisKey=hash(source.key+'|'+JSON.stringify(notes||'scan')+'|'+JSON.stringify(song.review.scores)).slice(0,20);
  if(!analyses[analysisKey]){
   const words=source.text.split(/\s+/),unique=new Set(source.lines.map(norm)),found=topics.filter(([,re])=>re.test(source.text)).map(([name])=>name);
   const quote=notes?.quote||'';
   try { validateLyricExcerpt(source.text,quote); } catch(error) { throw new Error(song.title+': '+error.message); }
   analyses[analysisKey]={
    version:`Text considered: ${source.title}. ${source.kind==='artist-publisher-page'?'Artist/publisher text':source.kind==='published-hymnal'?'Published hymn transcription':source.kind==='music-resource-page'?'Public music-resource lyric text':'Community transcription'}; the exact stanza selection and recording remain for human verification. This report concerns the catalog text, independently of personal or imported assessments.`,
    summary:status==='partial-text'?'Only an incomplete or suspect transcription is available. These notes identify the evidence limits; no numerical score is assigned.':notes?'A preliminary AI reading of doctrinal accuracy, theological substance, and language, with separate catalog text scores. The reasons explain these provisional scores, not your personal or imported judgments. No church-use decision is made.':'A deterministic first pass over an identified transcription. It records textual evidence, not a theological score or a completed AI evaluation.',
    reasons:notes?[
      {criterion:'Doctrinal accuracy',explanation:notes.accuracy},{criterion:'Theological substance',explanation:notes.substance},{criterion:'Language & craftsmanship',explanation:notes.language}
    ]:[
      {criterion:'Textual topics',explanation:found.length?`The transcription contains explicit vocabulary concerning ${found.join(', ').toLowerCase()}. These are search observations; reading the complete sentences is necessary before deciding what claims the song makes.`:'The available text has not yet received a claim-by-claim theological reading; no themes or doctrines are inferred from the title.'},
      {criterion:'Text development',explanation:`The supplied transcription contains ${unique.size} distinct nonempty lines and ${words.length} words. These counts identify the amount of available text, not depth, correctness, popularity or congregational suitability.`},
      {criterion:'Repetition and limits',explanation:`${source.lines.length-unique.size} repeated line occurrences appear in this transcription. Repetition can serve emphasis or shared confession; no quality or arrangement score is assigned from this count.`}
    ],
    scores:Number.isFinite(song.review.scores.accuracy)?structuredClone(song.review.scores):notes?.newScores?{accuracy:notes.newScores[0],substance:notes.newScores[1],language:notes.newScores[2],time:null}:structuredClone(song.review.scores),
    quote,concerns:notes?.concern?[notes.concern]:[],themes:notes?.themes||found,
    scriptures:notes?notes.references.map(ref=>scripture(ref,notes.themes.join(', '))):[],
    source:{url:source.url,label:`${source.title} · ${source.artist||'hymnal text'} · source transcription`,kind:source.kind,checkedAt,hash:hash(source.text)},
    limits:['The supplied transcription may omit, alter or misattribute a stanza. Compare it with your selected text before using the assessment.','Artist association does not verify a specific recording. No tempo, key, duration, arrangement or instrumental quality was inferred.','Human judgments, saved concerns, personal themes, recordings, approvals, libraries and plans are unchanged.','A supporting Scripture comparison is distinct from a verified quotation or deliberate allusion in the song.'],
   };
  }
 }
 records[song.id]={id:song.id,title:song.title,author:song.author,status,analysisKey,...(r.identityAssumption?{identityAssumption:r.identityAssumption}:{})};
 manifest.push({...records[song.id],sourceHash:source?hash(source.text):null,sourceURL:source?.url||null,reason:source?null:r.status==='title-only'?'Title candidates lack sufficient identity evidence.':'No source text matched in the audited collections.'});
}
const count=status=>Object.values(records).filter(r=>r.status===status).length;
for(const record of Object.values(records)){
 if(record.status==='reviewed-draft'&&!['accuracy','substance','language'].every(key=>{
  const score=analyses[record.analysisKey]?.scores?.[key];return Number.isFinite(score)&&score>=0&&score<=10;
 }))throw new Error('Completed text review needs three explicit criterion scores: '+record.id);
}
const assumed=Object.values(records).filter(r=>r.identityAssumption).length;
const coverage={assumed,total:allCatalogSongs.length,reviewed:count('reviewed-draft'),textScans:count('text-scan'),unresolved:count('identity-unresolved'),missing:count('missing-text'),partial:count('partial-text'),checkedAt};
const data={coverage,scriptureSource:{url:'https://github.com/thiagobodruk/bible/blob/master/json/en_kjv.json',translation:'KJV',hash:bibleHash},records,analyses};
if(outputDirectory)await mkdir(outputDirectory,{recursive:true});
await writeFile(outputDirectory?join(outputDirectory,'catalog-analysis-data.js'):new URL('../public/catalog-analysis-data.js',import.meta.url),[
 '// Generated public-text evidence. Full lyrics and personal workspace data are excluded.',
 'export const catalogAnalysisData = {',
 'coverage:'+JSON.stringify(data.coverage)+',',
 'scriptureSource:'+JSON.stringify(data.scriptureSource)+',',
 'records:{',...Object.entries(records).map(([id,r])=>JSON.stringify(id)+':'+JSON.stringify(r)+','),'},analyses:{',
 ...Object.entries(analyses).map(([id,a])=>JSON.stringify(id)+':'+JSON.stringify(a)+','),'}};',''
].join('\n'));
await writeFile(outputDirectory?join(outputDirectory,'coverage.json'):new URL('../data/catalog-analysis/coverage.json',import.meta.url),JSON.stringify({coverage,records:manifest},null,2)+'\n');
console.log(coverage);
