import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const ids=['00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000084'];
const workspace={version:1,songs:[],libraries:[{id:'me',name:'My songs',songIds:[]}],plans:[]};
test('organizations enforce verified invitations, role boundaries, tenant/OAuth isolation, revision saves and atomic ownership transfer',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create schema auth;create role anon;create role authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);grant usage on schema auth to authenticated;create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;`);
  for(let i=0;i<ids.length;i++)await db.query('insert into auth.users values($1,$2,$3)',[ids[i],`member${i}@example.test`,i===3?null:'2026-10-13']);
  await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
  const sql=await readFile('supabase/organizations.sql','utf8');await db.exec(sql);await db.exec(sql);
  const as=async(index,oauth=false)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[index],...(oauth?{client_id:ids[2]}:{})})]);await db.exec('set role authenticated');};
  const rpc=async(name,args=[])=>{const parameters=args.map((_,i)=>'$'+(i+1)).join(',');return (await db.query(`select public.${name}(${parameters}) as result`,args)).rows[0].result;};
  await as(0);const org=await rpc('org_create',['First team',JSON.stringify(workspace)]);
  assert.equal((await rpc('org_list')).organizations[0].role,'owner');
  const invite=await rpc('org_invite',[org,'member1@example.test','viewer']);
  await as(2);assert.equal((await db.query('select * from public.organizations')).rows.length,0);assert.equal((await db.query('select * from public.organization_workspaces')).rows.length,0);
  await assert.rejects(rpc('org_accept',[invite]),/unavailable/);await assert.rejects(rpc('org_snapshot',[org,null]),/membership/);
  await as(3);await assert.rejects(rpc('org_create',['Unverified',JSON.stringify(workspace)]),/verified/);
  await as(1);assert.equal((await rpc('org_list')).invitations.length,1);assert.equal(await rpc('org_accept',[invite]),org);
  assert.equal((await rpc('org_snapshot',[org,null])).role,'viewer');
  await db.exec('reset role');await db.query("insert into storage.objects values('organization-files',$1)",[org+'/song/chart.pdf']);await as(1);assert.equal((await db.query('select * from storage.objects')).rows.length,1);await assert.rejects(db.query("insert into storage.objects values('organization-files',$1)",[org+'/song/viewer.pdf']),/row-level security/);
  await assert.rejects(rpc('org_save',[org,1,JSON.stringify(workspace)]),/view only/);
  await assert.rejects(rpc('org_invite',[org,'member2@example.test','editor']),/owner or administrator/);
  await assert.rejects(db.query('update public.organization_members set role=\'owner\''),/permission denied/);
  await as(0);await rpc('org_change_role',[org,ids[1],'editor']);
  await as(1);assert.equal((await rpc('org_save',[org,1,JSON.stringify(workspace)])).revision,2);
  await assert.rejects(rpc('org_save',[org,1,JSON.stringify(workspace)]),/changed/);
  assert.equal((await rpc('org_snapshot',[org,2])).workspace,null);
  await as(0,true);assert.equal((await db.query('select * from storage.objects')).rows.length,0);assert.equal((await db.query('select * from public.organization_workspaces')).rows.length,0);await assert.rejects(rpc('org_snapshot',[org,null]),/verified/);
  await as(0);await assert.rejects(rpc('org_remove_member',[org,ids[0]]),/Transfer/);await rpc('org_transfer',[org,ids[1]]);
  assert.equal((await rpc('org_list')).organizations[0].role,'admin');await assert.rejects(rpc('org_delete',[org]),/Only the owner/);
  await as(1);assert.equal((await rpc('org_list')).organizations[0].role,'owner');
  await rpc('org_remove_member',[org,ids[0]]);await as(0);await assert.rejects(rpc('org_snapshot',[org,null]),/membership/);
  await as(1);const canceled=await rpc('org_invite',[org,'member2@example.test','admin']);await rpc('org_revoke_invite',[org,canceled]);await as(2);await assert.rejects(rpc('org_accept',[canceled]),/unavailable/);
  await as(1);await rpc('org_delete',[org]);assert.equal((await rpc('org_list')).organizations.length,0);
 } finally {await db.close();}
});
