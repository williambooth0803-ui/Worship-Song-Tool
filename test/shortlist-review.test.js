import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shortlistEntries,shortlistIds} from '../public/shortlist-data.js';
import {allCatalogSongs,catalogSongs} from '../public/catalog.js';
import {overall,defaultProfile} from '../public/core.js';
import {emptyReview,validateShortlistReview,reviewCounts,setReviewDecision,mergeReviewBackup,decisionCSV,decisionSummary} from '../public/shortlist-review.js';

test('the owner’s strict above-8.5 rule retains seven for review and two explicit exceptions',()=>{
  const audit=JSON.parse(readFileSync(new URL('../data/catalog-selection/decisions-150.json',import.meta.url),'utf8'));
  assert.equal(shortlistEntries.length,150);assert.equal(new Set(shortlistIds).size,150);
  assert.deepEqual(shortlistEntries,audit.records);
  const pending=shortlistEntries.filter(s=>s.initialChoice==='later'),kept=shortlistEntries.filter(s=>s.initialChoice==='keep');
  assert.equal(pending.length,7);assert.ok(pending.every(s=>s.rating>8.5));
  assert.deepEqual(kept.map(s=>s.title).sort(),['All of a Sudden','Lord of the Dance']);
  for(const entry of shortlistEntries){
    const current=allCatalogSongs.find(s=>s.id===entry.id);
    if(entry.initialChoice==='remove')assert.equal(current,undefined);
    else {assert.ok(current);assert.equal(overall(current.review,defaultProfile),entry.rating);}
  }
  assert.equal(allCatalogSongs.length,835);assert.equal(catalogSongs.length,69);
});
test('review starts with the owner’s decisions; edits preserve notes, source data and the original decision snapshot',()=>{
  const baseline=emptyReview(),before=structuredClone(baseline),id=baseline.cursor;
  assert.deepEqual(reviewCounts(baseline),{keep:2,remove:141,later:7,unreviewed:0,decided:143,total:150});
  const edited=setReviewDecision(baseline,id,'keep','Keep this for our church.','2026-10-19T18:00:00Z');
  assert.equal(reviewCounts(edited).keep,3);assert.equal(reviewCounts(edited).later,6);
  assert.deepEqual(baseline,before);assert.equal(edited.decisions[id].note,'Keep this for our church.');
  assert.deepEqual(validateShortlistReview(JSON.parse(JSON.stringify(edited))),edited);
  assert.equal(shortlistEntries.find(s=>s.id===id).initialChoice,'later');
});
test('backup merge retains newer choices, rejects foreign records and never accepts workspace data as a decision backup',()=>{
  const baseline=emptyReview(),id=baseline.cursor;
  const newer=setReviewDecision(baseline,id,'keep','Latest note','2026-10-19T19:00:00Z');
  const older=setReviewDecision(baseline,id,'remove','Old note','2026-10-19T18:00:00Z');
  assert.deepEqual(mergeReviewBackup(newer,older).decisions[id],newer.decisions[id]);
  assert.deepEqual(mergeReviewBackup(older,newer).decisions[id],newer.decisions[id]);
  const skewed=setReviewDecision(baseline,id,'keep','Other device clock','2099-01-01T00:00:00Z');
  const changed=setReviewDecision(skewed,id,'later','My newer choice');
  assert.ok(Date.parse(changed.decisions[id].updatedAt)>Date.parse(skewed.decisions[id].updatedAt));
  assert.equal(mergeReviewBackup(changed,skewed).decisions[id].choice,'later');
  assert.throws(()=>validateShortlistReview({songs:[],libraries:[],plans:[]}),/decision backup/);
  assert.throws(()=>setReviewDecision(baseline,'foreign-song','keep'),/valid song/);
  assert.throws(()=>setReviewDecision(baseline,id,'approve'),/valid song/);
  const invalid=structuredClone(baseline);invalid.decisions[id].note='x'.repeat(1001);assert.throws(()=>validateShortlistReview(invalid),/invalid song/);
  invalid.decisions[id]={choice:'keep',note:'',updatedAt:'invalid'};assert.throws(()=>validateShortlistReview(invalid),/date/);
});
test('decision exports keep exact IDs and stable original numbers, escape CSV notes and describe draft removals',()=>{
  const baseline=emptyReview(),id=shortlistIds[1],review=setReviewDecision(baseline,id,'keep','=HYPERLINK("example")\nSecond line');
  const csv=decisionCSV(review,shortlistEntries),summary=decisionSummary(review);
  assert.match(csv,/Number.*Song ID/);assert.ok(csv.includes(id));assert.ok(csv.includes("'=HYPERLINK("));assert.ok(csv.includes('""example""'));
  assert.match(summary,/Keep \(3\): 2, 7, 109/);assert.match(summary,/Remove \(141\)/);assert.match(summary,/preserve saved workspace copies/);
});
