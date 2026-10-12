-- Run once in the Supabase SQL editor. Row-level security isolates each account.
begin;
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null check (jsonb_typeof(workspace) = 'object' and workspace->>'version' = '1'),
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
revoke all on public.workspaces from anon, authenticated;
grant select, insert, update on public.workspaces to authenticated;
drop policy if exists "Read own workspace" on public.workspaces;
create policy "Read own workspace" on public.workspaces for select to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Insert own workspace" on public.workspaces;
create policy "Insert own workspace" on public.workspaces for insert to authenticated with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Update own workspace" on public.workspaces;
create policy "Update own workspace" on public.workspaces for update to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null) with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
create or replace function public.set_workspace_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists workspace_updated_at on public.workspaces;
create trigger workspace_updated_at before update on public.workspaces for each row execute function public.set_workspace_updated_at();
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles for update to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null) with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop trigger if exists profile_updated_at on public.profiles;
create trigger profile_updated_at before update on public.profiles for each row execute function public.set_workspace_updated_at();
commit;
