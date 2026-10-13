-- Additive shared workspaces. Personal workspaces/profiles and OAuth grants stay separate.
begin;
create table if not exists public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
 owner_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','editor','viewer')), joined_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create unique index if not exists organization_single_owner on public.organization_members(organization_id) where role='owner';
create table if not exists public.organization_invites (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and length(email) between 3 and 320),
 role text not null check(role in ('admin','editor','viewer')), invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '14 days',
 accepted_at timestamptz, revoked_at timestamptz, unique(organization_id,email)
);
create table if not exists public.organization_workspaces (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 workspace jsonb not null check(jsonb_typeof(workspace)='object' and workspace->>'version'='1'),
 revision bigint not null default 1, updated_at timestamptz not null default now()
);
create or replace function public.org_actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or auth.jwt()->>'client_id' is not null or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null) then raise exception 'Sign in with a verified email account.' using errcode='42501'; end if;
 return actor;
end $$;
create or replace function public.org_role(org uuid) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.organization_members m join auth.users u on u.id=m.user_id
 where m.organization_id=org and m.user_id=auth.uid() and u.email_confirmed_at is not null and auth.jwt()->>'client_id' is null
$$;
create or replace function public.org_invitee(address text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=address and auth.jwt()->>'client_id' is null)
$$;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.organization_workspaces enable row level security;
revoke all on public.organizations,public.organization_members,public.organization_invites,public.organization_workspaces from anon,authenticated;
grant select on public.organizations,public.organization_members,public.organization_invites,public.organization_workspaces to authenticated;
drop policy if exists organization_read on public.organizations;
create policy organization_read on public.organizations for select to authenticated using(public.org_role(id) is not null);
drop policy if exists organization_member_read on public.organization_members;
create policy organization_member_read on public.organization_members for select to authenticated using(public.org_role(organization_id) is not null);
drop policy if exists organization_invite_read on public.organization_invites;
create policy organization_invite_read on public.organization_invites for select to authenticated using(public.org_role(organization_id) in ('owner','admin') or public.org_invitee(email));
drop policy if exists organization_workspace_read on public.organization_workspaces;
create policy organization_workspace_read on public.organization_workspaces for select to authenticated using(public.org_role(organization_id) is not null);

create or replace function public.org_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=public.org_actor(); result jsonb;
begin
 select jsonb_build_object('organizations',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'ownerId',o.owner_id,'role',m.role) order by o.name) from public.organizations o join public.organization_members m on m.organization_id=o.id where m.user_id=actor),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'organizationId',o.id,'name',o.name,'role',i.role,'email',i.email,'expiresAt',i.expires_at)) from public.organization_invites i join public.organizations o on o.id=i.organization_id where public.org_invitee(i.email) and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.org_create(org_name text, initial_workspace jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.org_actor(); org uuid;
begin
 if length(trim(org_name)) not between 1 and 100 then raise exception 'Enter an organization name of up to 100 characters.'; end if;
 if initial_workspace->>'version' is distinct from '1' or jsonb_typeof(initial_workspace->'songs') is distinct from 'array' or jsonb_typeof(initial_workspace->'libraries') is distinct from 'array' or jsonb_typeof(initial_workspace->'plans') is distinct from 'array' or pg_column_size(initial_workspace)>5242880 then raise exception 'Invalid organization workspace.'; end if;
 insert into public.organizations(name,owner_id) values(trim(org_name),actor) returning id into org;
 insert into public.organization_members(organization_id,user_id,role) values(org,actor,'owner');
 insert into public.organization_workspaces(organization_id,workspace) values(org,initial_workspace);
 return org;
end $$;
create or replace function public.org_members(org uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.org_actor();
 if public.org_role(org) is null then raise exception 'Organization access is unavailable.' using errcode='42501'; end if;
 return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'email',u.email,'role',m.role,'joinedAt',m.joined_at) order by m.joined_at) from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=org),'[]'::jsonb),
 'invitations',case when public.org_role(org) in ('owner','admin') then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'expiresAt',i.expires_at)) from public.organization_invites i where i.organization_id=org and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()),'[]'::jsonb) else '[]'::jsonb end);
end $$;
create or replace function public.org_invite(org uuid,address text,member_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.org_actor(); actor_role text; invitation uuid;
begin
 perform 1 from public.organizations where id=org for update;
 actor_role:=public.org_role(org);
 if actor_role not in ('owner','admin') or actor_role is null or (member_role='admin' and actor_role<>'owner') then raise exception 'Only an owner or administrator can grant this access.' using errcode='42501'; end if;
 address:=lower(trim(address));
 if member_role not in ('admin','editor','viewer') or length(address)>320 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Choose a valid email and access role.'; end if;
 if exists(select 1 from public.organization_members m join auth.users u on u.id=m.user_id where m.organization_id=org and lower(u.email)=address) then raise exception 'This account is already a member.'; end if;
 insert into public.organization_invites(organization_id,email,role,invited_by) values(org,address,member_role,actor)
 on conflict(organization_id,email) do update set id=gen_random_uuid(),role=excluded.role,invited_by=excluded.invited_by,created_at=now(),expires_at=now()+interval '14 days',accepted_at=null,revoked_at=null returning id into invitation;
 return invitation;
end $$;
create or replace function public.org_accept(invitation uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.org_actor(); invite public.organization_invites; org uuid;
begin
 select organization_id into org from public.organization_invites where id=invitation;
 perform 1 from public.organizations where id=org for update;
 select * into invite from public.organization_invites where id=invitation for update;
 if invite.id is null or not public.org_invitee(invite.email) or invite.accepted_at is not null or invite.revoked_at is not null or invite.expires_at<=now() then raise exception 'This invitation is unavailable for this account.' using errcode='42501'; end if;
 insert into public.organization_members(organization_id,user_id,role) values(invite.organization_id,actor,invite.role) on conflict do nothing;
 update public.organization_invites set accepted_at=now() where id=invitation;
 return invite.organization_id;
end $$;
create or replace function public.org_decline(invitation uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.org_actor();
 update public.organization_invites set revoked_at=now() where id=invitation and public.org_invitee(email) and accepted_at is null;
 if not found then raise exception 'This invitation is unavailable for this account.' using errcode='42501'; end if;
end $$;
create or replace function public.org_revoke_invite(org uuid,invitation uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor_role text;
begin
 perform public.org_actor();perform 1 from public.organizations where id=org for update;actor_role:=public.org_role(org);
 if actor_role not in ('owner','admin') or actor_role is null then raise exception 'Administrator access required.' using errcode='42501'; end if;
 update public.organization_invites set revoked_at=now() where id=invitation and organization_id=org and accepted_at is null and (actor_role='owner' or role<>'admin');
 if not found then raise exception 'This invitation cannot be revoked.' using errcode='42501'; end if;
end $$;
create or replace function public.org_change_role(org uuid,member uuid,member_role text) returns void language plpgsql security definer set search_path='' as $$
declare actor_role text;target_role text;
begin
 perform public.org_actor();perform 1 from public.organizations where id=org for update;actor_role:=public.org_role(org);
 select role into target_role from public.organization_members where organization_id=org and user_id=member;
 if actor_role not in ('owner','admin') or actor_role is null or target_role is null or target_role='owner' or member_role not in ('admin','editor','viewer') or (actor_role='admin' and (target_role='admin' or member_role='admin')) then raise exception 'This role change is unavailable.' using errcode='42501'; end if;
 update public.organization_members set role=member_role where organization_id=org and user_id=member;
end $$;
create or replace function public.org_remove_member(org uuid,member uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.org_actor(); actor_role text;target_role text;
begin
 perform 1 from public.organizations where id=org for update;actor_role:=public.org_role(org);
 select role into target_role from public.organization_members where organization_id=org and user_id=member;
 if target_role is null or target_role='owner' or (member<>actor and (actor_role not in ('owner','admin') or actor_role is null or (actor_role='admin' and target_role='admin'))) then raise exception 'Transfer ownership before leaving; only administrators can remove other members.' using errcode='42501'; end if;
 delete from public.organization_members where organization_id=org and user_id=member;
end $$;
create or replace function public.org_transfer(org uuid,member uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.org_actor();
begin
 perform 1 from public.organizations where id=org for update;
 if public.org_role(org) is distinct from 'owner' or member=actor or not exists(select 1 from public.organization_members where organization_id=org and user_id=member) then raise exception 'Only the owner can transfer to another existing member.' using errcode='42501'; end if;
 update public.organization_members set role='admin' where organization_id=org and user_id=actor;
 update public.organization_members set role='owner' where organization_id=org and user_id=member;
 update public.organizations set owner_id=member where id=org;
end $$;
create or replace function public.org_rename(org uuid,org_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.org_actor();perform 1 from public.organizations where id=org for update;
 if public.org_role(org) not in ('owner','admin') or public.org_role(org) is null then raise exception 'Administrator access required.' using errcode='42501'; end if;
 if length(trim(org_name)) not between 1 and 100 then raise exception 'Enter an organization name.'; end if;
 update public.organizations set name=trim(org_name) where id=org;
end $$;
create or replace function public.org_delete(org uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.org_actor();perform 1 from public.organizations where id=org for update;
 if public.org_role(org) is distinct from 'owner' then raise exception 'Only the owner can delete an organization.' using errcode='42501'; end if;
 delete from public.organizations where id=org;
end $$;
create or replace function public.org_snapshot(org uuid,known_revision bigint default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare member_role text; result jsonb;
begin
 perform public.org_actor();member_role:=public.org_role(org);
 if member_role is null then raise exception 'Organization membership is no longer available.' using errcode='42501'; end if;
 select jsonb_build_object('id',o.id,'name',o.name,'ownerId',o.owner_id,'role',member_role,'revision',w.revision,'updatedAt',w.updated_at,'workspace',case when known_revision=w.revision then null else w.workspace end) into result from public.organizations o join public.organization_workspaces w on w.organization_id=o.id where o.id=org;
 return result;
end $$;
create or replace function public.org_save(org uuid,expected_revision bigint,new_workspace jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint; result jsonb;
begin
 perform public.org_actor();perform 1 from public.organizations where id=org for update;
 if public.org_role(org) not in ('owner','admin','editor') or public.org_role(org) is null then raise exception 'This organization is view only for your account.' using errcode='42501'; end if;
 select revision into current_revision from public.organization_workspaces where organization_id=org for update;
 if expected_revision is null or current_revision is distinct from expected_revision then raise exception 'The organization changed. Reload or merge before saving.' using errcode='40001'; end if;
 if new_workspace->>'version' is distinct from '1' or jsonb_typeof(new_workspace->'songs') is distinct from 'array' or jsonb_typeof(new_workspace->'libraries') is distinct from 'array' or jsonb_typeof(new_workspace->'plans') is distinct from 'array' or pg_column_size(new_workspace)>5242880 then raise exception 'Invalid organization workspace.'; end if;
 update public.organization_workspaces set workspace=new_workspace,revision=revision+1,updated_at=clock_timestamp() where organization_id=org returning jsonb_build_object('revision',revision,'updatedAt',updated_at) into result;
 return result;
end $$;
-- Explicit function grants keep anonymous and read-only OAuth callers out.
revoke all on function public.org_actor(),public.org_role(uuid),public.org_invitee(text),public.org_list(),public.org_create(text,jsonb),public.org_members(uuid),public.org_invite(uuid,text,text),public.org_accept(uuid),public.org_decline(uuid),public.org_revoke_invite(uuid,uuid),public.org_change_role(uuid,uuid,text),public.org_remove_member(uuid,uuid),public.org_transfer(uuid,uuid),public.org_rename(uuid,text),public.org_delete(uuid),public.org_snapshot(uuid,bigint),public.org_save(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.org_role(uuid),public.org_invitee(text),public.org_list(),public.org_create(text,jsonb),public.org_members(uuid),public.org_invite(uuid,text,text),public.org_accept(uuid),public.org_decline(uuid),public.org_revoke_invite(uuid,uuid),public.org_change_role(uuid,uuid,text),public.org_remove_member(uuid,uuid),public.org_transfer(uuid,uuid),public.org_rename(uuid,text),public.org_delete(uuid),public.org_snapshot(uuid,bigint),public.org_save(uuid,bigint,jsonb) to authenticated;
create or replace function public.org_file_access(file_name text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare org uuid; member_role text;
begin
 if split_part(file_name,'/',1) !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false; end if;
 org:=split_part(file_name,'/',1)::uuid;member_role:=public.org_role(org);
 return case when writing then coalesce(member_role in ('owner','admin','editor'),false) else member_role is not null end;
end $$;
revoke all on function public.org_file_access(text,boolean) from public,anon,authenticated;
grant execute on function public.org_file_access(text,boolean) to authenticated;
do $$begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit) values('organization-files','organization-files',false,10485760) on conflict(id) do update set public=false,file_size_limit=10485760;
  execute 'drop policy if exists organization_files_read on storage.objects';
  execute 'create policy organization_files_read on storage.objects for select to authenticated using(bucket_id=''organization-files'' and public.org_file_access(name,false))';
  execute 'drop policy if exists organization_files_insert on storage.objects';
  execute 'create policy organization_files_insert on storage.objects for insert to authenticated with check(bucket_id=''organization-files'' and public.org_file_access(name,true))';
  execute 'drop policy if exists organization_files_delete on storage.objects';
  execute 'create policy organization_files_delete on storage.objects for delete to authenticated using(bucket_id=''organization-files'' and public.org_file_access(name,true))';
 end if;
end $$;

commit;
