import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {syncCatalog} from '../public/catalog.js';
import {seedSongs} from '../public/seeds.js';
import {defaultProfile} from '../public/core.js';
import {reveal} from './disclosure.mjs';

// Browser clients use synthetic auth; every organization RPC executes the real migration
// in PostgreSQL with the caller's role/JWT. No production accounts or emails are touched.
export async function checkOrganizationFlows(browser,base) {
 const db=new PGlite(),contexts=[],errors=[],emails=[],personal=new Map(),versions=new Map();
 const users=['owner','editor','viewer'].map((name,i)=>({id:`00000000-0000-0000-0000-00000000009${i+1}`,email:`${name}@organizations.test`,name}));
 let queue=Promise.resolve();
 const serial=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
 const parameters={list:[],create:['org_name','initial_workspace'],members:['org'],invite:['org','address','member_role'],accept:['invitation'],decline:['invitation'],revoke_invite:['org','invitation'],change_role:['org','member','member_role'],remove_member:['org','member'],transfer:['org','member'],rename:['org','org_name'],delete:['org'],snapshot:['org','known_revision'],save:['org','expected_revision','new_workspace']};
 try {
  await db.exec(`create schema auth;create schema storage;create role anon;create role authenticated;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);grant usage on schema auth,storage to authenticated;create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;`);
  await db.exec(await readFile('supabase/organizations.sql','utf8'));
  for(const user of users) {
   await db.query('insert into auth.users values($1,$2,now())',[user.id,user.email]);
   const state=syncCatalog({version:1,songs:structuredClone(seedSongs),libraries:[{id:'mine',name:'My private songs',songIds:[]}],plans:[],profile:{...defaultProfile,setupComplete:true,aiMode:user.name==='viewer'?'manual':'full'}});
   state.songs[0].review.notes=`PRIVATE ${user.name} note`;personal.set(user.id,state);versions.set(user.id,'2026-10-13T12:00:00.000Z');
  }
  async function pageFor(user) {
   const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
   await context.addInitScript(({user,state})=>{if(sessionStorage.getItem('org-fixture'))return;sessionStorage.setItem('org-fixture','1');localStorage.setItem('faithful-repertoire-session',JSON.stringify({project:'https://fixture.supabase.co',session:{access_token:'fixture-'+user.id,refresh_token:'refresh-'+user.id,user}}));localStorage.setItem('faithful-repertoire-user:'+user.id,JSON.stringify(state));},{user,state:personal.get(user.id)});
   await context.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:'export const siteConfig={supabaseUrl:"https://fixture.supabase.co",supabasePublishableKey:"sb_publishable_organization_fixture"};'}));
   await context.route('https://*.mzstatic.com/**',route=>route.abort());
   await context.route('https://fixture.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    const answer=(value,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'},body:status===204?'':JSON.stringify(value)});
    if(request.method()==='OPTIONS')return answer(null,204);
    if(url.pathname.endsWith('/otp')) {emails.push(request.postDataJSON().email);return answer({});}
    const actor=users.find(u=>request.headers().authorization==='Bearer fixture-'+u.id);if(!actor)return answer({message:'Sign in'},401);
    if(url.pathname.endsWith('/user'))return answer(actor);
    if(url.pathname.includes('/rpc/org_')) {
     const name=url.pathname.split('/rpc/org_')[1],args=parameters[name];if(!args)return answer({message:'Unknown function'},404);
     try {
      const value=await serial(async()=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:actor.id})]);await db.exec('set role authenticated');try{return (await db.query(`select public.org_${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args.map(key=>{const value=request.postDataJSON()[key];return value&&typeof value==='object'?JSON.stringify(value):value;}))).rows[0].value;}finally{await db.exec('reset role');}});
      return answer(value);
     }catch(error){return answer({message:error.message,code:error.code},error.code==='42501'?403:error.code==='40001'?409:400);}
    }
    if(url.pathname.endsWith('/profiles'))return answer(request.method()==='GET'?[{profile:personal.get(actor.id).profile}]:null,request.method()==='GET'?200:204);
    if(url.pathname.endsWith('/workspaces')){
     assert.equal(url.searchParams.get('user_id'),`eq.${actor.id}`);
     if(request.method()==='GET')return answer([{workspace:personal.get(actor.id),updated_at:versions.get(actor.id)}]);
     personal.set(actor.id,request.postDataJSON().workspace);const version=new Date().toISOString();versions.set(actor.id,version);return answer([{updated_at:version}]);
    }
    return answer({message:'Unknown fixture route'},404);
   });
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
   await page.goto(base);await page.getByRole('button',{name:'My account',exact:true}).waitFor();return page;
  }
  const owner=await pageFor(users[0]),editor=await pageFor(users[1]),viewer=await pageFor(users[2]);
  const orgs=async page=>{await page.getByLabel('Workspace',{exact:true}).selectOption('__manage__');await page.locator('#organization-create-form').waitFor();};
  await orgs(owner);await owner.locator('#organization-create-form input').fill('Shared worship team');await owner.locator('#organization-create-form button').click();
  await owner.locator('.organization-banner').filter({hasText:'Shared worship team'}).waitFor();
  const org=await owner.getByLabel('Workspace',{exact:true}).inputValue();
  const manage=async page=>{await orgs(page);await page.locator(`[data-manage-organization="${org}"]`).click();await page.locator('.organization-members').waitFor();};
  await manage(owner);
  for(const [member,role] of [[users[1],'editor'],[users[2],'viewer']]) {
   await owner.locator('#organization-invite-form input[name="email"]').fill(member.email);await owner.locator('#organization-invite-form select').selectOption(role);await owner.locator('#organization-invite-form button').click();
   await owner.locator('.organization-invites strong').filter({hasText:member.email}).waitFor();
  }
  assert.deepEqual(emails,[users[1].email,users[2].email]);
  for(const page of [editor,viewer]) {
   await orgs(page);await page.locator('[data-accept-invitation]').click();await page.locator(`[data-open-organization="${org}"]`).waitFor();await page.locator(`[data-open-organization="${org}"]`).click();await page.locator('.organization-banner').waitFor();
  }
  assert.match(await viewer.locator('.organization-banner').textContent(),/View only/);assert.equal(await viewer.locator('.ai-mark').count(),0,'Personal Human-only mode also hides shared AI content');
  await viewer.getByRole('button',{name:'Manage files',exact:true}).click();
  assert.equal(await viewer.locator('#song-file-form').count(),0,'View-only file dialog offers no upload controls');
  assert.equal(await viewer.locator('[data-action="delete-song-file"]').count(),0);
  await viewer.getByRole('button',{name:'Close dialog',exact:true}).click();
  await owner.getByRole('button',{name:'Close dialog',exact:true}).click();
  for(const page of [owner,editor,viewer])await page.locator('.nav-item[data-view="plans"]').click();
  assert.equal(await viewer.getByRole('button',{name:'+ New plan',exact:true}).isDisabled(),true);
  await owner.getByRole('button',{name:'+ New plan',exact:true}).click();await owner.getByLabel('Plan name',{exact:true}).fill('Shared Sunday');await owner.locator('#plan-form .primary').click();
  await editor.getByRole('heading',{name:'Shared Sunday',exact:true}).waitFor({timeout:10000});await viewer.getByRole('heading',{name:'Shared Sunday',exact:true}).waitFor({timeout:10000});
  assert.equal(await viewer.getByRole('button',{name:'Add songs',exact:true}).isDisabled(),true);
  const direct=await viewer.evaluate(async org=>{const response=await fetch('https://fixture.supabase.co/rest/v1/rpc/org_save',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-00000000-0000-0000-0000-000000000093'},body:JSON.stringify({org,expected_revision:1,new_workspace:{version:1,songs:[],libraries:[],plans:[]}})});return response.status;},org);assert.equal(direct,403);
  // Disjoint edits start from the same shared revision and must merge automatically.
  await owner.getByRole('button',{name:'Edit plan details',exact:true}).click();await editor.getByRole('button',{name:'Edit plan details',exact:true}).click();
  await owner.getByLabel('Theme',{exact:true}).fill('Owner theme');await editor.getByLabel('Plan name',{exact:true}).fill('Edited by teammate');
  await owner.locator('#plan-form .primary').click();await editor.locator('#plan-form .primary').click();
  await owner.getByRole('heading',{name:'Edited by teammate',exact:true}).waitFor({timeout:12000});await editor.locator('.plan-sheet').getByText('Owner theme',{exact:true}).waitFor({timeout:12000});
  await viewer.getByRole('heading',{name:'Edited by teammate',exact:true}).waitFor({timeout:12000});
  await manage(owner);await owner.locator(`[data-member-role="${users[2].id}"]`).selectOption('editor');
  await viewer.locator('.organization-banner').filter({hasText:'Editor'}).waitFor({timeout:10000});assert.equal(await viewer.getByRole('button',{name:'Add songs',exact:true}).isDisabled(),false);
  await owner.locator(`[data-transfer-member="${users[1].id}"]`).click();await owner.locator('.organization-members li').filter({has:owner.getByText(users[1].email,{exact:true})}).getByText('Owner',{exact:true}).waitFor();
  await manage(editor);assert.ok(await editor.locator('#delete-organization').isVisible());
  await editor.locator(`[data-remove-member="${users[0].id}"]`).click();
  await owner.waitForFunction(()=>document.querySelector('#workspace-select')?.value==='personal',{},{timeout:10000});
  const originalNote=await owner.evaluate(id=>JSON.parse(localStorage.getItem('faithful-repertoire-user:'+id)).songs[0].review.notes,users[0].id);assert.equal(originalNote,'PRIVATE owner note');
  await owner.locator('.nav-item[data-view="settings"]').click();assert.equal(await owner.getByLabel('Workspace',{exact:true}).inputValue(),'personal');
  await editor.getByRole('button',{name:'Close dialog',exact:true}).click();await editor.getByLabel('Workspace',{exact:true}).selectOption('personal');await editor.waitForFunction(()=>document.querySelector('#workspace-select')?.value==='personal');
  await orgs(editor);await editor.locator('#organization-create-form input').fill('Second team');await editor.locator('#organization-create-form button').click();await editor.locator('.organization-banner').filter({hasText:'Second team'}).waitFor();
  await editor.getByLabel('Workspace',{exact:true}).selectOption(org);await editor.locator('.organization-banner').filter({hasText:'Shared worship team'}).waitFor();
  assert.ok(await editor.getByLabel('Workspace',{exact:true}).locator('option').filter({hasText:'Second team'}).count());
  await editor.setViewportSize({width:390,height:844});assert.ok(await editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await editor.screenshot({path:'/tmp/faithful-organizations-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: real-SQL organization browser flows, email invitation requests, acceptance, personal isolation, multi-workspace switching, automatic shared updates, concurrent merge, view-only rejection, role changes, ownership transfer and member removal.');
 } finally {for(const context of contexts)await context.close();await queue;await db.close();}
}
