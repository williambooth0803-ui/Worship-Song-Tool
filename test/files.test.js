import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { filePath } from "../public/song-files.js";
const owner="10000000-0000-4000-8000-000000000001",other="10000000-0000-4000-8000-000000000002";
test("attachment paths bind the owner and cannot introduce extra path segments",()=>{
  const path=filePath(owner,"song-id","file-id","../../chart.pdf");
  assert.ok(path.startsWith(owner+"/song-id/file-id-"));assert.equal(path.split("/").length,3);assert.ok(!path.includes(".."));
  assert.throws(()=>filePath(owner,"../song","file","chart.pdf"),/Invalid/);
});
test("private storage policies isolate accounts and reject read-only OAuth file access",async()=>{
  const db=new PGlite();try{
    await db.exec(`create schema auth; create schema storage; create role authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema auth,storage to authenticated;grant select,insert,delete on storage.objects to authenticated;create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;`);
    const migration=await readFile("supabase/files.sql","utf8");await db.exec(migration);await db.exec(migration);
    assert.equal((await db.query("select public from storage.buckets where id='song-files'")).rows[0].public,false);
    await db.exec(`insert into storage.objects values('song-files','${owner}/song/file.pdf'),('song-files','${other}/song/private.pdf');`);
    const identity=async(user,oauth=false)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,...(oauth?{client_id:other}:{})})]);await db.exec('set role authenticated');};
    await identity(owner);assert.equal((await db.query('select * from storage.objects')).rows.length,1);
    await assert.rejects(db.query("insert into storage.objects values('song-files',$1)",[other+'/song/injected.pdf']),/row-level security/);
    assert.equal((await db.query("delete from storage.objects where name=$1 returning name",[other+'/song/private.pdf'])).rows.length,0);
    await identity(owner,true);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await assert.rejects(db.query("insert into storage.objects values('song-files',$1)",[owner+'/song/oauth.pdf']),/row-level security/);
  }finally{await db.close();}
});
