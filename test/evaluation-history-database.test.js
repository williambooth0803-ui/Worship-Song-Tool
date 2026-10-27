import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('older personal/shared clients cannot erase history by omission; explicit deletion and per-row isolation remain supported',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon;create role authenticated;create table public.workspaces(id int primary key,workspace jsonb);create table public.organization_workspaces(id int primary key,workspace jsonb);');
    const sql=await readFile('supabase/migrations/20261027154912_preserve_evaluation_history.sql','utf8');await db.exec(sql);await db.exec(sql);
    for(const table of ['workspaces','organization_workspaces']){
      await db.query(`insert into public.${table} values(1,$1),(2,$2)`,[JSON.stringify({version:1,evaluationHistory:[{id:'private-report'}]}),JSON.stringify({version:1,evaluationHistory:[{id:'other-report'}]})]);
      await db.query(`update public.${table} set workspace=$1 where id=1`,[JSON.stringify({version:1,plans:[{title:'Older client edit'}]})]);
      let rows=(await db.query(`select workspace from public.${table} order by id`)).rows;
      assert.equal(rows[0].workspace.evaluationHistory[0].id,'private-report');assert.equal(rows[0].workspace.plans[0].title,'Older client edit');assert.equal(rows[1].workspace.evaluationHistory[0].id,'other-report');
      await assert.rejects(db.query(`update public.${table} set workspace=$1 where id=1`,[JSON.stringify({version:1,evaluationHistory:null})]),/must be an array/);
      await assert.rejects(db.query(`update public.${table} set workspace=$1 where id=1`,[JSON.stringify({version:1,evaluationHistory:Array(101).fill({id:'too-many'})})]),/History is full/);
      await db.query(`update public.${table} set workspace=$1 where id=1`,[JSON.stringify({version:1,evaluationHistory:[]})]);
      rows=(await db.query(`select workspace from public.${table} where id=1`)).rows;assert.deepEqual(rows[0].workspace.evaluationHistory,[]);
    }
  }finally{await db.close();}
});
