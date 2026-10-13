import test from "node:test";
import assert from "node:assert/strict";
import { AutosaveQueue } from "../public/autosave.js";
test("autosave serializes edits made during an upload and saves the newest snapshot",async()=>{
  let release;const writes=[],states=[];
  const q=new AutosaveQueue({save:async s=>{writes.push(s.value);if(writes.length===1)await new Promise(r=>release=r);},onState:s=>states.push(s.phase)});
  q.reset(true);q.enqueue({value:1});const flush=q.flush();q.enqueue({value:2});release();await flush;
  assert.deepEqual(writes,[1,2]);assert.equal(q.pending,null);assert.deepEqual(states,["saving","saved","saving","saved"]);
});
test("offline failures retain the newest edit, retry explicitly and conflicts stay paused",async()=>{
  let fail=true;const writes=[];const q=new AutosaveQueue({save:async s=>{if(fail)throw new Error("offline");writes.push(s.value);}});
  q.reset(true);q.enqueue({value:1});await q.flush();assert.equal(q.phase,"error");q.enqueue({value:2});fail=false;await q.retry();assert.deepEqual(writes,[2]);
  q.save=async()=>{const e=new Error("newer remote copy");e.name="WorkspaceConflictError";throw e;};q.enqueue({value:3});await q.flush();assert.equal(q.phase,"conflict");await q.retry();assert.equal(q.phase,"conflict");q.reset(false);assert.equal(q.pending,null);
});
test("account changes discard stale completion notifications and pending snapshots",async()=>{
  let release;const states=[];const q=new AutosaveQueue({save:()=>new Promise(r=>release=r),onState:s=>states.push(s.phase)});
  q.reset(true);q.enqueue({value:"owner one"});const upload=q.flush();q.reset(false);release();await upload;assert.deepEqual(states,["saving"]);assert.equal(q.pending,null);assert.equal(q.phase,"paused");
});
