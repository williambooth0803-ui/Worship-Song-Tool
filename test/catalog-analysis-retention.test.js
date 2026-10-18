import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allCatalogSongs} from '../public/catalog.js';
import {catalogAnalysisData as data} from '../public/catalog-analysis-data.js';
import {retainCatalogEvidence} from '../scripts/catalog-analysis-retention.mjs';

const manifest=JSON.parse(await readFile(new URL('../data/catalog-analysis/coverage.json',import.meta.url),'utf8'));
test('incremental research preserves old reports, research dates and unknown evidence after cache loss',()=>{
 for(const status of ['reviewed-draft','missing-text','identity-unresolved','partial-text']){
  const song=allCatalogSongs.find(song=>data.records[song.id].status===status);
  if(!song)continue; // A later source batch may resolve the final partial text.
  const coverage=manifest.records.find(record=>record.id===song.id);
  const retained=retainCatalogEvidence(song,data,coverage);
  assert.deepEqual(retained.record,data.records[song.id]);assert.deepEqual(retained.coverage,coverage);
  if(retained.analysis){
   const original=data.analyses[retained.record.analysisKey];assert.deepEqual(retained.analysis,original);
   retained.analysis.source.checkedAt='changed';assert.notEqual(original.source.checkedAt,'changed');
  }else assert.equal(retained.analysis,null);
 }
});
test('incremental research rejects changed identity, missing reports and mismatched source provenance',()=>{
 const song=allCatalogSongs.find(song=>data.records[song.id].status==='reviewed-draft');
 const coverage=manifest.records.find(record=>record.id===song.id);
 assert.throws(()=>retainCatalogEvidence({...song,title:'Different words'},data,coverage),/mismatched catalog/);
 assert.throws(()=>retainCatalogEvidence(song,data,{...coverage,status:'missing-text'}),/mismatched catalog/);
 assert.throws(()=>retainCatalogEvidence(song,data,{...coverage,sourceHash:'invented'}),/source evidence/);
 assert.throws(()=>retainCatalogEvidence(song,{...data,analyses:{}},coverage),/source evidence/);
});
