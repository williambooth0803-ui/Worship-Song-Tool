import {readFile} from 'node:fs/promises';
import {siteConfig} from '../public/config.js';

// Use the existing encrypted deployment credential; never print response bodies
// or credentials. This migration adds history without replacing current workspaces.
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw new Error('The encrypted SUPABASE_ACCESS_TOKEN deployment secret is unavailable.');
const project=new URL(siteConfig.supabaseUrl).hostname.split('.')[0];
async function api(path,body) {
  const response=await fetch(`https://api.supabase.com/v1/projects/${project}${path}`,{
    method:body===undefined?'GET':'POST',
    headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000),
  });
  if(!response.ok)throw new Error(`Supabase history deployment failed: HTTP ${response.status} at ${path}. No credentials are logged.`);
  return response.json();
}
await api('');
const query=(await Promise.all(['version-history.sql','migrations/20261027154912_preserve_evaluation_history.sql'].map(name=>readFile(new URL('../supabase/'+name,import.meta.url),'utf8')))).join('\n');
await api('/database/query',{query});
const rows=await api('/database/query',{query:`select
  to_regclass('public.workspace_versions') is not null as history_table,
  (select count(*)=4 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('history_list','history_get','history_checkpoint','history_apply')) as history_rpcs,
  (select count(*)=2 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and t.tgname in ('workspace_history','organization_workspace_history') and not t.tgisinternal) as history_triggers,
  (select count(*)=2 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('workspaces','organization_workspaces') and t.tgname='evaluation_history_preserve' and not t.tgisinternal) as evaluation_guards;`});
if(!rows?.[0]?.history_table || !rows[0].history_rpcs || !rows[0].history_triggers || !rows[0].evaluation_guards)throw new Error('History migration verification failed. Inspect the database migration before retrying.');
console.log('Private account history installed and verified: table, four guarded RPCs, two checkpoint triggers and two evaluation archive preservation guards.');
