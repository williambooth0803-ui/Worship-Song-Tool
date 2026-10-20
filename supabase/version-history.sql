-- Apply after schema.sql and organizations.sql. Safe to rerun.
-- Snapshots stay private in the existing account database; no public bucket.
begin;
create table if not exists public.workspace_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  workspace jsonb not null,
  label text not null,
  created_at timestamptz not null default clock_timestamp(),
  check ((user_id is null) <> (organization_id is null))
);
create index if not exists workspace_versions_user on public.workspace_versions(user_id,created_at desc);
create index if not exists workspace_versions_org on public.workspace_versions(organization_id,created_at desc);
alter table public.workspace_versions enable row level security;
revoke all on public.workspace_versions from public,anon,authenticated;

create or replace function public.history_access(target_org uuid,writing boolean default false)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid := auth.uid(); member_role text;
begin
  if actor is null or auth.jwt()->>'client_id' is not null then
    raise exception 'Sign in with a native account to use version history.' using errcode='42501';
  end if;
  if target_org is not null then
    perform public.org_actor();
    member_role := public.org_role(target_org);
    if member_role is null then raise exception 'Current organization membership is required.' using errcode='42501'; end if;
    if writing and member_role not in ('owner','admin','editor') then raise exception 'This organization is view only.' using errcode='42501'; end if;
  end if;
  return actor;
end $$;

-- Internal helper. Only triggers and the checked RPCs may call it.
create or replace function public.history_record(owner_id uuid,org_id uuid,snapshot jsonb,version_label text,forced boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare version_id uuid; last_saved timestamptz;
begin
  select max(created_at) into last_saved from public.workspace_versions
    where user_id is not distinct from owner_id and organization_id is not distinct from org_id;
  if not forced and last_saved > clock_timestamp()-interval '5 minutes' then return null; end if;
  insert into public.workspace_versions(user_id,organization_id,actor_id,workspace,label)
    values(owner_id,org_id,auth.uid(),snapshot,left(version_label,100)) returning id into version_id;
  -- Bound both the number of versions and total snapshot bytes per workspace.
  delete from public.workspace_versions where id in (
    select id from (
      select id,row_number() over(order by created_at desc,id desc) as n,
        sum(pg_column_size(workspace)) over(order by created_at desc,id desc) as bytes
      from public.workspace_versions where user_id is not distinct from owner_id
        and organization_id is not distinct from org_id
    ) ranked where n>30 or (n>1 and bytes>41943040)
  );
  return version_id;
end $$;

create or replace function public.history_on_save()
returns trigger language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;
begin
  if tg_op='UPDATE' then
    if old.workspace = new.workspace then return new; end if;
    snapshot := old.workspace;
  else snapshot := new.workspace;
  end if;
  if tg_table_name='workspaces' then
    perform public.history_record(new.user_id,null,snapshot,'Automatic checkpoint',false);
  else
    perform public.history_record(null,new.organization_id,snapshot,'Automatic checkpoint',false);
  end if;
  return new;
end $$;
drop trigger if exists workspace_history on public.workspaces;
create trigger workspace_history after insert or update on public.workspaces for each row execute function public.history_on_save();
drop trigger if exists organization_workspace_history on public.organization_workspaces;
create trigger organization_workspace_history after insert or update on public.organization_workspaces for each row execute function public.history_on_save();

create or replace function public.history_list(target_org uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid := public.history_access(target_org);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'createdAt',created_at,'label',label,'source','account',
    'summary',jsonb_build_object('songs',jsonb_array_length(workspace->'songs'),
      'libraries',jsonb_array_length(workspace->'libraries'),'plans',jsonb_array_length(workspace->'plans'),
      'lenses',case when jsonb_typeof(workspace->'lenses')='array' then jsonb_array_length(workspace->'lenses') else 1 end))
    order by created_at desc,id desc) from public.workspace_versions
    where (target_org is null and user_id=actor) or (target_org is not null and organization_id=target_org)),'[]'::jsonb);
end $$;

create or replace function public.history_get(target_org uuid,version_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid := public.history_access(target_org); result jsonb;
begin
  select jsonb_build_object('id',id,'workspace',workspace,'label',label,'createdAt',created_at,'source','account') into result
    from public.workspace_versions where id=version_id and
    ((target_org is null and user_id=actor) or (target_org is not null and organization_id=target_org));
  if result is null then raise exception 'This version is no longer available.' using errcode='P0002'; end if;
  return result;
end $$;

create or replace function public.history_checkpoint(target_org uuid,version_label text default 'Saved version')
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := public.history_access(target_org,true); snapshot jsonb;
begin
  if target_org is null then
    select workspace into snapshot from public.workspaces where user_id=actor for update;
  else
    perform 1 from public.organizations where id=target_org for update;
    -- Recheck after the lock: member removal/role changes lock this same row.
    perform public.history_access(target_org,true);
    select workspace into snapshot from public.organization_workspaces where organization_id=target_org for update;
  end if;
  if snapshot is null then raise exception 'Save your workspace to your account first.'; end if;
  return public.history_record(case when target_org is null then actor end,target_org,snapshot,coalesce(nullif(trim(version_label),''),'Saved version'),true);
end $$;

-- Atomic compare-and-swap restore. Never merge an old snapshot into a newer save.
-- The current cloud copy is checkpointed in the same transaction before replacement.
create or replace function public.history_apply(target_org uuid,new_workspace jsonb,expected_updated_at timestamptz default null,expected_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := public.history_access(target_org,true); current_workspace jsonb; current_updated timestamptz; current_revision bigint;
begin
  if jsonb_typeof(new_workspace) is distinct from 'object' or new_workspace->>'version' is distinct from '1'
    or jsonb_typeof(new_workspace->'songs') is distinct from 'array'
    or jsonb_typeof(new_workspace->'libraries') is distinct from 'array'
    or jsonb_array_length(new_workspace->'libraries')=0
    or jsonb_typeof(new_workspace->'plans') is distinct from 'array'
    or pg_column_size(new_workspace)>5242880 then raise exception 'Invalid workspace backup.' using errcode='22023'; end if;
  if target_org is null then
    select workspace,updated_at into current_workspace,current_updated from public.workspaces where user_id=actor for update;
    if current_workspace is null or expected_updated_at is null or current_updated<>expected_updated_at then
      raise exception 'The account workspace changed. Refresh and preview again.' using errcode='40001'; end if;
  else
    perform 1 from public.organizations where id=target_org for update;
    perform public.history_access(target_org,true);
    select workspace,revision into current_workspace,current_revision from public.organization_workspaces where organization_id=target_org for update;
    if current_workspace is null or expected_revision is null or current_revision<>expected_revision then
      raise exception 'The shared workspace changed. Refresh and preview again.' using errcode='40001'; end if;
  end if;
  perform public.history_record(case when target_org is null then actor end,target_org,current_workspace,'Before restoring a version',true);
  if target_org is null then
    update public.workspaces set workspace=new_workspace where user_id=actor returning updated_at into current_updated;
    if jsonb_typeof(new_workspace->'profile')='object' then
      insert into public.profiles(user_id,profile) values(actor,new_workspace->'profile')
        on conflict(user_id) do update set profile=excluded.profile;
    end if;
  else
    update public.organization_workspaces set workspace=new_workspace,revision=revision+1,updated_at=clock_timestamp()
      where organization_id=target_org returning revision,updated_at into current_revision,current_updated;
  end if;
  return jsonb_build_object('updatedAt',current_updated,'revision',current_revision);
end $$;

revoke all on function public.history_access(uuid,boolean),public.history_record(uuid,uuid,jsonb,text,boolean),public.history_on_save(),
  public.history_list(uuid),public.history_get(uuid,uuid),public.history_checkpoint(uuid,text),public.history_apply(uuid,jsonb,timestamptz,bigint)
  from public,anon,authenticated;
grant execute on function public.history_list(uuid),public.history_get(uuid,uuid),public.history_checkpoint(uuid,text),public.history_apply(uuid,jsonb,timestamptz,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
