import test from "node:test";
import assert from "node:assert/strict";
import { libraryAuditPrompt, auditSongs, parseLibraryAudit, auditCharts, auditToken } from "../public/library-audit.js";
const workspace = () => ({profile:{aiMode:"full"},libraries:[{id:"mine",name:"Mine",songIds:["a","b","hidden"]}],plans:[{title:"PRIVATE PLAN"}],songs:[{id:"a",title:"One",author:"Artist",version:"Album",review:{notes:"PRIVATE NOTE"},metadata:{tempo:70,lyrics:"PRIVATE WORDS"}},{id:"b",title:"Two",author:"Other",version:"Album"},{id:"hidden",title:"Hidden",blacklisted:true}]});
const report = () => ({schema:"faithful-library-audit-v1",libraryId:"mine",summary:"Evidence limited",strengths:["Known reference"],weaknesses:[],limitations:["One unknown"],songs:[{id:"a",direction:"toGod",trinity:["father","son"],voice:"corporate",mood:"lament",function:"petition",evidence:"Confirmed text reference",sources:[{url:"https://example.com/lyrics",label:"Text"}]},{id:"b",direction:"unknown",trinity:["unknown"],voice:"unknown",mood:"unknown",function:"unknown",evidence:"Text unavailable",sources:[]}]});
test("audit requests exclude blacklist and private data by default and require explicit AI preference",()=>{
  const w=workspace(), prompt=libraryAuditPrompt(w,"mine");
  for(const secret of ["PRIVATE NOTE","PRIVATE PLAN","PRIVATE WORDS",'"id":"hidden"']) assert.ok(!prompt.includes(secret));
  assert.ok(libraryAuditPrompt(w,"mine","",true).includes("PRIVATE WORDS"));
  assert.equal(auditSongs(w,"mine").length,2);
  const before=auditToken(w,"mine");w.songs[0].version="Different";assert.notEqual(auditToken(w,"mine"),before);
  w.profile.aiMode="manual";assert.throws(()=>libraryAuditPrompt(w,"mine"),/Full AI/);
});
test("report charts calculate overlapping Trinity counts and unknowns without fabricated tempo",()=>{
  const w=workspace(), before=structuredClone(w), r=parseLibraryAudit(JSON.stringify(report()),w,"mine"), charts=auditCharts(r,w);
  const trinity=charts.find(c=>c.key==="trinity");assert.equal(trinity.known,1);assert.equal(trinity.counts.father,1);assert.equal(trinity.counts.son,1);assert.equal(trinity.counts.unknown,1);
  const tempo=charts.find(c=>c.key==="tempo");assert.equal(tempo.counts["Below 80 BPM"],1);assert.equal(tempo.counts.Unknown,1);assert.deepEqual(w,before);
});
test("audit import rejects wrong libraries, missing/duplicate IDs, unsafe sources and unsupported writes",()=>{
  const w=workspace();const parse=r=>parseLibraryAudit(JSON.stringify(r),w,"mine");
  let r=report();r.libraryId="other";assert.throws(()=>parse(r),/different/);
  r=report();r.songs.pop();assert.throws(()=>parse(r),/every/);
  r=report();r.songs[1].id="a";assert.throws(()=>parse(r),/duplicate/);
  r=report();r.songs[0].sources[0].url="javascript:alert(1)";assert.throws(()=>parse(r),/HTTPS/);
  r=report();r.songs[0].scores={accuracy:10};assert.throws(()=>parse(r),/scores/);
  r=report();r.songs[0].trinity=["unknown","son"];assert.throws(()=>parse(r),/Trinitarian/);
});
