import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {compareVersions,retainedVersions,historySummary,CloudHistory,HISTORY_LIMIT} from '../public/version-history.js';

const workspace={version:1,songs:[],libraries:[{id:'me',name:'My songs',songIds:[]}],plans:[]};
test('history comparison covers saved fields without exposing private titles or generated text',()=>{
  const current={...workspace,songs:[{id:'one',title:'Private excluded song',review:{notes:'Old note'}}],profile:{aiMode:'manual'},lenses:[{id:'main',name:'Sunday'}]};
  const restored=structuredClone(current);restored.songs[0].review.notes='Restored note';restored.libraries=[];
  restored.plans=[{id:'service',title:'Private service'}];restored.lenses[0].name='Prayer night';restored.activeLensId='main';
  const diff=compareVersions(current,restored);
  assert.deepEqual(diff.songs,{added:0,removed:0,changed:1});
  assert.equal(diff.libraries.removed,1);assert.equal(diff.plans.added,1);assert.equal(diff.lenses.changed,1);
  assert.equal(diff.profileChanged,false);assert.equal(diff.activeLensChanged,false);
  assert.ok(!JSON.stringify(diff).includes('Private'));assert.equal(historySummary(restored).lenses,1);
});
test('history retention bounds snapshot count and bytes, keeping the latest version',()=>{
  const rows=Array.from({length:45},(_,i)=>({id:String(i),createdAt:i,bytes:1_000_000}));
  assert.equal(retainedVersions(rows).length,HISTORY_LIMIT);assert.equal(retainedVersions(rows)[0].id,'44');
  assert.equal(retainedVersions(rows.map(row=>({...row,bytes:10*1024*1024}))).length,4);
  assert.equal(retainedVersions([{id:'huge',createdAt:1,bytes:50*1024*1024}]).length,1);
});
test('cloud history rejects a response after switching accounts',async()=>{
  const accounts={user:{id:'first'},userId:()=>accounts.user.id,request:async()=>{accounts.user={id:'second'};return [];}};
  await assert.rejects(new CloudHistory(accounts).list(null),/account changed/);
});
test('cloud history uses the authenticated account transport and structured RPC arguments',async()=>{
  const calls=[],accounts={user:{id:'owner'},userId:()=>accounts.user.id,request:async(path,options)=>{calls.push({path,...options});return [];}};
  const cloud=new CloudHistory(accounts);
  await cloud.list(null);await cloud.capture('team','Named version');await cloud.apply(null,workspace,'2026-10-19T12:00:00Z',null);
  assert.deepEqual(calls[0],{path:'/rest/v1/rpc/history_list',method:'POST',authenticated:true,body:{target_org:null}});
  assert.equal(calls[1].body.version_label,'Named version');assert.deepEqual(calls[2].body.new_workspace,{...workspace,evaluationClient:4});
});
test('history deployment stops before writes on failed authentication and verifies migration results',async()=>{
  const originalFetch=globalThis.fetch,originalToken=process.env.SUPABASE_ACCESS_TOKEN,originalLog=console.log;
  const calls=[],messages=[];
  try {
    process.env.SUPABASE_ACCESS_TOKEN='synthetic-deployment-credential';console.log=value=>messages.push(value);
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:false,status:401};};
    await assert.rejects(import('../scripts/deploy-history.mjs?unauthorized'),/HTTP 401/);
    assert.equal(calls.length,1);assert.equal(calls[0].options.method,'GET','Failed authentication must not reach a database write');
    calls.length=0;
    globalThis.fetch=async(url,options)=>{
      calls.push({url,options});return {ok:true,json:async()=>calls.length===3?[{history_table:true,history_rpcs:true,history_triggers:true,evaluation_guards:true}]:{}};
    };
    await import('../scripts/deploy-history.mjs?verified');
    assert.equal(calls.length,3);assert.ok(calls[1].url.endsWith('/database/query'));
    assert.equal(JSON.parse(calls[1].options.body).query,(await Promise.all(['version-history.sql','migrations/20261027154912_preserve_evaluation_history.sql','migrations/20261027230003_guard_scored_evaluations.sql'].map(name=>readFile('supabase/'+name,'utf8')))).join('\n'));
    assert.match(messages.join(' '),/installed and verified/);assert.ok(!messages.join(' ').includes(process.env.SUPABASE_ACCESS_TOKEN));
    globalThis.fetch=async()=>({ok:true,json:async()=>[]});
    await assert.rejects(import('../scripts/deploy-history.mjs?invalid-verification'),/verification failed/);
  }finally{
    globalThis.fetch=originalFetch;console.log=originalLog;
    if(originalToken===undefined)delete process.env.SUPABASE_ACCESS_TOKEN;else process.env.SUPABASE_ACCESS_TOKEN=originalToken;
  }
});

test('database history enforces native owner/member access, bounded checkpoints and atomic stale-safe restores',async()=>{
  const db=new PGlite();
  const ids=['00000000-0000-0000-0000-000000000071','00000000-0000-0000-0000-000000000072','00000000-0000-0000-0000-000000000073'];
  try {
    await db.exec(`create schema auth;create role anon;create role authenticated;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      grant usage on schema auth to authenticated;
      create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
      create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;`);
    for(let i=0;i<ids.length;i++)await db.query('insert into auth.users values($1,$2,now())',[ids[i],`history${i}@example.test`]);
    for(const file of ['schema.sql','organizations.sql','version-history.sql','version-history.sql'])await db.exec(await readFile('supabase/'+file,'utf8'));
    const as=async(index,oauth=false)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[index],...(oauth?{client_id:ids[2]}:{})})]);await db.exec('set role authenticated');};
    const rpc=async(name,args=[])=> (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args)).rows[0].result;
    await as(0);
    await db.query('insert into public.workspaces(user_id,workspace) values($1,$2)',[ids[0],JSON.stringify(workspace)]);
    const original=(await rpc('history_list',[null]))[0];assert.equal(original.summary.libraries,1);
    const changed={...workspace,libraries:[{id:'me',name:'Changed library',songIds:[]}]};
    await db.query('update public.workspaces set workspace=$1 where user_id=$2',[JSON.stringify(changed),ids[0]]);
    assert.equal((await rpc('history_list',[null])).length,1,'Automatic saves throttle within five minutes');
    const updated=(await db.query('select updated_at from public.workspaces where user_id=$1',[ids[0]])).rows[0].updated_at;
    const restored=await rpc('history_apply',[null,JSON.stringify({...workspace,profile:{aiMode:'manual',principles:'Restored account criteria'}}),updated,null]);
    assert.equal((await db.query('select profile from public.profiles where user_id=$1',[ids[0]])).rows[0].profile.principles,'Restored account criteria');
    const recovery=(await rpc('history_list',[null]))[0];assert.equal(recovery.label,'Before restoring a version');
    assert.equal((await rpc('history_get',[null,recovery.id])).workspace.libraries[0].name,'Changed library');
    await assert.rejects(rpc('history_apply',[null,JSON.stringify(changed),updated,null]),/changed/);
    assert.equal((await db.query('select workspace from public.workspaces where user_id=$1',[ids[0]])).rows[0].workspace.libraries[0].name,'My songs');
    await assert.rejects(db.query('select * from public.workspace_versions'),/permission denied/);
    await assert.rejects(rpc('history_record',[ids[0],null,JSON.stringify(workspace),'Forged',true]),/permission denied/);
    await as(1);assert.equal((await rpc('history_list',[null])).length,0);
    await assert.rejects(rpc('history_get',[null,original.id]),/no longer available/);
    await assert.rejects(rpc('history_apply',[null,JSON.stringify(changed),restored.updatedAt,null]),/changed/);
    await as(0,true);await assert.rejects(rpc('history_list',[null]),/native account/);
    await assert.rejects(rpc('history_get',[null,original.id]),/native account/);
    await assert.rejects(rpc('history_checkpoint',[null,'OAuth checkpoint']),/native account/);
    await assert.rejects(rpc('history_apply',[null,JSON.stringify(changed),restored.updatedAt,null]),/native account/);
    await as(0);
    const org=await rpc('org_create',['History team',JSON.stringify(workspace)]);
    const invitation=await rpc('org_invite',[org,'history1@example.test','viewer']);
    const orgVersion=(await rpc('history_list',[org]))[0];
    await as(1);await rpc('org_accept',[invitation]);
    assert.equal((await rpc('history_get',[org,orgVersion.id])).workspace.libraries.length,1);
    await assert.rejects(rpc('history_checkpoint',[org,'Viewer checkpoint']),/view only/);
    await assert.rejects(rpc('history_apply',[org,JSON.stringify(changed),null,1]),/view only/);
    await as(2);await assert.rejects(rpc('history_list',[org]),/membership/);
    await as(0);await rpc('org_change_role',[org,ids[1],'editor']);
    await as(1);await rpc('org_save',[org,1,JSON.stringify(changed)]);
    const orgRestored=await rpc('history_apply',[org,JSON.stringify(workspace),null,2]);assert.equal(orgRestored.revision,3);
    assert.equal((await db.query('select * from public.profiles where user_id=$1',[ids[1]])).rows.length,0,'Shared restores must not change personal profiles');
    await assert.rejects(rpc('history_apply',[org,JSON.stringify(changed),null,2]),/changed/);
    assert.equal((await rpc('org_snapshot',[org,null])).workspace.libraries[0].name,'My songs');
    await as(0);await rpc('org_remove_member',[org,ids[1]]);
    await as(1);await assert.rejects(rpc('history_get',[org,orgVersion.id]),/membership/);
    await as(0);
    for(let i=0;i<35;i++)await rpc('history_checkpoint',[null,'Named '+i]);
    const retained=await rpc('history_list',[null]);assert.equal(retained.length,30);assert.equal(retained[0].label,'Named 34');
    await assert.rejects(rpc('history_apply',[null,JSON.stringify({...workspace,libraries:[]}),restored.updatedAt,null]),/Invalid workspace/);
    // Restoring an expired version cannot be used to retrieve another tenant's blob.
    await assert.rejects(rpc('history_get',[org,retained[0].id]),/no longer available/);
    await db.exec('reset role');await db.query('delete from public.organizations where id=$1',[org]);
    assert.equal((await db.query('select count(*) as count from public.workspace_versions where organization_id=$1',[org])).rows[0].count,0);
  }finally{await db.close();}
});
