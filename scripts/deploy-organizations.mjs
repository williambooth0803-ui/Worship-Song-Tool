// Additive migration using the existing management credential, never a frontend secret.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {siteConfig} from '../public/config.js';
const project=new URL(siteConfig.supabaseUrl).hostname.split('.')[0];
const credential=process.env.SUPABASE_ACCESS_TOKEN||process.env.s;
if(!credential)throw new Error('The existing Supabase management credential is unavailable. Frontend setup still needs only public configuration.');
async function query(sql) {
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify({query:sql}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('Management query failed (HTTP '+response.status+'). No credentials are logged.');return response.json();
}
const before=await query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname");
const tables=await query("select table_name,column_name,data_type from information_schema.columns where table_schema='public' and table_name in ('organizations','organization_members','organization_invites','organization_workspaces') order by table_name,ordinal_position");
const previousBucket=await query("select id from storage.buckets where id='organization-files'");
await writeFile('/tmp/faithful-before-organizations-policies.json',JSON.stringify(before,null,2));
if(!process.argv.includes('--apply')) {console.log(JSON.stringify({project,existingOrganizationColumns:tables.length,existingPolicyCount:before.length,action:'Read-only inspection. Pass --apply after tests.'}));process.exit(0);}
if(previousBucket.length&&!tables.length)throw new Error('The existing organization-files bucket has an unrecognized owner. It was preserved.');
if(tables.length) {
 const installed=await query("select to_regprocedure('public.org_actor()') is not null as known");
 if(!installed[0]?.known)throw new Error('Existing organization tables belong to an unrecognized schema. They were preserved.');
}
const migration=await readFile(new URL('../supabase/organizations.sql',import.meta.url),'utf8');
await query(migration);
const after=await query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname");
for(const policy of before) {
 if(policy.policyname.startsWith('organization_'))continue;
 const current=after.find(row=>row.schemaname===policy.schemaname&&row.tablename===policy.tablename&&row.policyname===policy.policyname);
 if(JSON.stringify(current)!==JSON.stringify(policy))throw new Error('An existing policy changed; inspect the saved policy backup before proceeding.');
}
const verification=await query("select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('organizations','organization_members','organization_invites','organization_workspaces') order by c.relname");
if(verification.length!==4||verification.some(row=>!row.relrowsecurity))throw new Error('Organization row-level security could not be verified.');
const tablesACL=await query("select table_name,privilege_type from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name like 'organization%' order by table_name,privilege_type");
if(tablesACL.some(row=>row.privilege_type!=='SELECT'))throw new Error('Unexpected direct write grants on organization tables.');
const buckets=await query("select id,public,file_size_limit from storage.buckets where id='organization-files'");
if(buckets[0]?.public!==false)throw new Error('Organization file storage must remain private.');
console.log(JSON.stringify({project,migrationSHA256:createHash('sha256').update(migration).digest('hex'),rowLevelSecurity:verification,directTableWrites:'denied',oldPolicies:'preserved',privateOrganizationFiles:true}));
