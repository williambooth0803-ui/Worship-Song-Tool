import test from 'node:test';
import assert from 'node:assert/strict';
import {allCatalogSongs,catalogSongs,syncCatalog,CATALOG_REVISION} from '../public/catalog.js';
import {catalogAnalysisData as data} from '../public/catalog-analysis-data.js';
import {catalogAnalysisFor,catalogAnalysisMarkup,enrichCatalogEvaluation,validateLyricExcerpt} from '../public/catalog-analysis.js';
import {defaultProfile} from '../public/core.js';
import {validateWorkspace} from '../public/backup.js';
import {reviewForDisplay} from '../public/profile.js';

test('catalog analysis accounts for every record without calling missing or partial evidence completed',()=>{
 assert.equal(Object.keys(data.records).length,allCatalogSongs.length);
 const c=data.coverage;assert.equal(c.reviewed+c.textScans+c.unresolved+c.missing+c.partial,c.total);
 assert.equal(c.total,1000);assert.equal(c.partial,Object.values(data.records).filter(r=>r.status==='partial-text').length);assert.ok(c.reviewed>200);assert.ok(c.missing+c.unresolved>0);
 for(const song of allCatalogSongs){const r=data.records[song.id];assert.equal(r.title,song.title);assert.equal(r.author,song.author);
  if(r.status==='reviewed-draft'){const a=data.analyses[r.analysisKey];assert.equal(a.reasons.length,3);assert.equal(new Set(a.reasons.map(r=>r.criterion)).size,3);assert.ok(a.reasons.every(r=>r.explanation.length>80));assert.ok(a.scriptures.length>=1);assert.ok(a.themes.length);assert.equal(a.scores.time,null);assert.ok(['accuracy','substance','language'].every(key=>Number.isFinite(a.scores[key])));assert.ok(Object.values(a.scores).every(s=>s===null||Number.isFinite(s)&&s>=0&&s<=10));assert.equal(a.source.hash.length,64);assert.equal(new URL(a.source.url).protocol,'https:');assert.ok(a.quote.length<=90);assert.ok(a.quote.split(/\s+/).filter(Boolean).length<=10);}
 }
});
test('new source-supported drafts carry lyric reasons and leave unresolved records genuinely unknown',()=>{
 const song=allCatalogSongs.find(s=>s.title==='I Sing the Mighty Power of God');assert.equal(song.review.status,'ai');assert.ok(song.review.claims.length>=3);assert.ok(song.review.sources.length);assert.equal(song.review.scores.time,null);
 const unknown=allCatalogSongs.find(s=>['missing-text','identity-unresolved'].includes(data.records[s.id].status)&&s.review.status==='unreviewed');assert.ok(unknown);assert.ok(Object.values(unknown.review.scores).every(s=>s===null));assert.equal(unknown.review.summary,'');assert.deepEqual(unknown.themes,[]);
 const unresolved=data.records[unknown.id];assert.ok(unresolved.reason);assert.ok(catalogAnalysisMarkup({...unresolved,analysis:null},s=>s).includes(unresolved.reason));
 for(const s of allCatalogSongs.filter(s=>data.records[s.id].status==='partial-text'))assert.equal(s.review.status,'unreviewed');
});
test('every starter record has expanded reasons and ambiguous modern wording retains its source context',()=>{
 assert.ok(catalogSongs.every(song=>data.records[song.id].status==='reviewed-draft'));
 const jireh=catalogAnalysisFor(allCatalogSongs.find(s=>s.title==='Jireh'));
 assert.equal(jireh.analysis.quote,'So I am enough');assert.match(jireh.analysis.concerns.join(' '),/self-sufficiency/);
 const known=catalogAnalysisFor(allCatalogSongs.find(s=>s.id==='expanded-known-by-you-elevation-rhythm'));
 assert.match(known.identityAssumption,/Gateway.*Elevation RHYTHM/);assert.match(known.identityAssumption,/does not verify/);
 assert.match(known.analysis.source.url,/known-by-you-gateway-worship/);
});
test('same-title texts remain separate, and identity edits, AI visibility and dismissal prevent stale catalog analysis',()=>{
 const lowry=allCatalogSongs.find(s=>s.id==='catalog-nothing-but-the-blood'),redman=allCatalogSongs.find(s=>s.id==='artist-nothing-but-the-blood-matt-redman');
 assert.notEqual(data.records[lowry.id].analysisKey,data.records[redman.id].analysisKey);
 assert.match(catalogAnalysisFor(redman).analysis.reasons[0].explanation,/Redman/);
 const city=allCatalogSongs.find(s=>s.id==='catalog-ancient-of-days'),sadler=allCatalogSongs.find(s=>s.title==='Ancient of Days (Blessing and Honor)');
 assert.notEqual(data.records[city.id].analysisKey,data.records[sadler.id].analysisKey);
 assert.match(catalogAnalysisFor(city).analysis.source.url,/cityalight/);
 assert.match(catalogAnalysisFor(sadler).analysis.source.url,/integrityworship/);
 const craig=allCatalogSongs.find(s=>s.id==='catalog-in-christ-alone-i-place-my-trust'),getty=allCatalogSongs.find(s=>s.id==='catalog-in-christ-alone');
 assert.notEqual(data.records[craig.id].analysisKey,data.records[getty.id].analysisKey);
 assert.match(catalogAnalysisFor(craig).analysis.reasons[0].explanation,/Craig\/Koch/);
 for(const mode of ['manual','limited'])assert.equal(catalogAnalysisFor(lowry,mode),null);
 assert.equal(catalogAnalysisFor({...lowry,aiDismissed:true}),null);
 assert.equal(catalogAnalysisFor({...lowry,title:'A different song'}),null);
 assert.equal(catalogAnalysisFor({...lowry,author:'A different author'}),null);
});
test('complete replacement sources resolve the suspect victory line and the previously incomplete medley',()=>{
 for(const id of ['expanded-unstoppable-god-elevation-worship','expanded-most-beautiful-so-in-love-maverick-city-music']){
  const record=catalogAnalysisFor(allCatalogSongs.find(s=>s.id===id));
  assert.equal(record.status,'reviewed-draft');assert.match(record.analysis.source.url,/multitracks/);
  assert.ok(Number.isFinite(record.analysis.scores.accuracy));assert.equal(record.analysis.reasons.length,3);
  assert.ok(!record.analysis.concerns.join(' ').includes('Jesus is overcome'));
 }
});
test('KJV comparison quotations retain the actual doctrinal claim and its qualifications',()=>{
 const scriptures=Object.values(data.analyses).flatMap(analysis=>analysis.scriptures);
 const trinity=scriptures.find(s=>s.reference==='Matthew 28:19');
 assert.match(trinity.quote,/Father, and of the Son, and of the Holy Ghost/);
 const providence=scriptures.find(s=>s.reference==='Romans 8:28');
 assert.match(providence.quote,/to them that love God/);assert.match(providence.quote,/called according to his purpose/);
 assert.equal(trinity.relationship,'Supporting comparison');assert.equal(providence.translation,'KJV');
});
test('catalog refresh and validated backups preserve human evaluations, convictions, approvals, recording removals and membership',()=>{
 const song=structuredClone(allCatalogSongs.find(s=>s.id==='modern-forever-we-sing-hallelujah-kari-jobe'));
 song.review.status='manual';song.review.notes='My saved concern about the grave-battle line.';song.review.scores.accuracy=3;song.review.customScores={'custom-conviction':2};song.recordings=[];song.aiDismissed=true; song.blacklisted=true;
 song.approval={status:'avoid',notes:'Human decision',updatedAt:null};
 const workspace={version:1,profile:structuredClone(defaultProfile),songs:[song],libraries:[{id:'mine',name:'My decisions',songIds:[song.id]}],plans:[]};
 const next=validateWorkspace(syncCatalog(workspace,allCatalogSongs,CATALOG_REVISION));const kept=next.songs.find(s=>s.id===song.id);
 assert.deepEqual(kept.review,song.review);assert.deepEqual(kept.recordings,[]);assert.deepEqual(kept.approval,song.approval);assert.equal(kept.aiDismissed,true);assert.equal(kept.blacklisted,true);assert.deepEqual(next.libraries,workspace.libraries);
 assert.equal(catalogAnalysisFor(kept),null);
});
test('refresh preserves imported drafts and identity-edited source snapshots',()=>{
 const song=structuredClone(allCatalogSongs[0]);song.review.model='ChatGPT evaluation · user-imported';song.review.summary='My selected alternate text.';song.catalogRevision=1;
 const before=structuredClone(song.review),w={version:1,profile:structuredClone(defaultProfile),songs:[song],libraries:[],plans:[]};
 assert.deepEqual(syncCatalog(w,allCatalogSongs).songs[0].review,before);
 song.review.model='Prewritten model-knowledge draft';song.title='My alternate text';
 assert.equal(syncCatalog(w,allCatalogSongs).songs[0].review.summary,'My selected alternate text.');
 assert.equal(reviewForDisplay(allCatalogSongs[0],'manual').scores.accuracy,null);
});
test('lyric quotations are exact short fragments, not invented or whole-song reproductions',()=>{
 assert.equal(validateLyricExcerpt('The source has one exact phrase.','one exact phrase'),'one exact phrase');
 assert.equal(validateLyricExcerpt('You’ve never failed me yet',"You've never failed me yet"),"You've never failed me yet");
 assert.throws(()=>validateLyricExcerpt('The source has no such words.','invented quotation'),/exact/);
 assert.throws(()=>validateLyricExcerpt('a '.repeat(20),'a '.repeat(11).trim()),/10 words/);
 assert.throws(()=>validateLyricExcerpt('x'.repeat(100),'x'.repeat(91)),/90 characters/);
});


test('expanded report respects hidden attributes and escapes source text',()=>{
 const song=allCatalogSongs.find(s=>s.id==='catalog-in-christ-alone'),record=catalogAnalysisFor(song);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html=catalogAnalysisMarkup(record,escape,new Set(['rating','claims','themes','scriptures','sources']));
 assert.ok(!html.includes('analysis-reasons'));assert.ok(!html.includes('analysis-scriptures'));assert.ok(!html.includes('analysis-themes'));assert.ok(!html.includes('href='));
 const changed=structuredClone(record);changed.analysis.summary='<script>unsafe()</script>';
 assert.ok(!catalogAnalysisMarkup(changed,escape).includes('<script>'));
});
