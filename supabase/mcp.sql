-- Run AFTER schema.sql and BEFORE enabling Supabase OAuth. Safe to rerun.
begin;
-- OAuth tokens cannot read raw workspaces or change application data.
drop policy if exists "Read own workspace" on public.workspaces;
create policy "Read own workspace" on public.workspaces for select to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Insert own workspace" on public.workspaces;
create policy "Insert own workspace" on public.workspaces for insert to authenticated with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Update own workspace" on public.workspaces;
create policy "Update own workspace" on public.workspaces for update to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null) with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles for update to authenticated using (auth.uid() = user_id and auth.jwt()->>'client_id' is null) with check (auth.uid() = user_id and auth.jwt()->>'client_id' is null);

create table if not exists public.mcp_connections (
 user_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null,
 client_name text not null check (length(client_name) between 1 and 200),
 enabled boolean not null default true,
 authorized_at timestamptz not null default now(),
 share_profile boolean not null default true,
 share_libraries boolean not null default true,
 share_plans boolean not null default true,
 share_notes boolean not null default false,
 share_lyrics boolean not null default false,
 primary key(user_id,client_id)
);
alter table public.mcp_connections enable row level security;
revoke all on public.mcp_connections from anon,authenticated;
grant select,insert,update on public.mcp_connections to authenticated;
drop policy if exists "Read own connections" on public.mcp_connections;
create policy "Read own connections" on public.mcp_connections for select to authenticated using (auth.uid()=user_id and (auth.jwt()->>'client_id' is null or auth.jwt()->>'client_id'=client_id::text));
drop policy if exists "Create own connection" on public.mcp_connections;
create policy "Create own connection" on public.mcp_connections for insert to authenticated with check (auth.uid()=user_id and auth.jwt()->>'client_id' is null);
drop policy if exists "Manage own connection" on public.mcp_connections;
create policy "Manage own connection" on public.mcp_connections for update to authenticated using (auth.uid()=user_id and auth.jwt()->>'client_id' is null) with check (auth.uid()=user_id and auth.jwt()->>'client_id' is null);
create or replace function public.mcp_authorization_time() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' or new.enabled then new.authorized_at=clock_timestamp();
 else new.authorized_at=old.authorized_at; end if;
 return new;
end $$;
drop trigger if exists mcp_authorization_time on public.mcp_connections;
create trigger mcp_authorization_time before insert or update on public.mcp_connections for each row execute function public.mcp_authorization_time();

create table if not exists public.mcp_rate_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 client_id uuid not null, window_start timestamptz not null, calls integer not null,
 primary key(user_id,client_id)
);
alter table public.mcp_rate_limits enable row level security;
revoke all on public.mcp_rate_limits from public,anon,authenticated;

-- This helper is pure JSON projection; it cannot read a table.
create or replace function public.mcp_pick(value jsonb, fields text[]) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(key,val),'{}'::jsonb) from jsonb_each(coalesce(value,'{}'::jsonb)) as entry(key,val) where key=any(fields)
$$;
revoke all on function public.mcp_pick(jsonb,text[]) from public,anon,authenticated;

create or replace function public.mcp_read_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare
 owner_id uuid=auth.uid(); jwt jsonb=auth.jwt(); connection public.mcp_connections;
 w jsonb; p jsonb; mode text; saved_at timestamptz; count_reads integer;
 s jsonb; raw jsonb; r jsonb; m jsonb; item jsonb; plan jsonb;
 songs jsonb='[]'; libraries jsonb='[]'; plans jsonb='[]'; items jsonb; arrangements jsonb; account_rating numeric;
begin
 if owner_id is null or jwt->>'role'<>'authenticated' or jwt->>'aud'<>'authenticated' or jwt->>'client_id' is null then raise insufficient_privilege using message='OAuth authorization required'; end if;
 select * into connection from public.mcp_connections where user_id=owner_id and client_id=(jwt->>'client_id')::uuid;
 if not found or not connection.enabled or coalesce((jwt->>'iat')::numeric,0)<floor(extract(epoch from connection.authorized_at)) then raise insufficient_privilege using message='Connection disabled or not authorized'; end if;
 insert into public.mcp_rate_limits as limits(user_id,client_id,window_start,calls) values(owner_id,connection.client_id,clock_timestamp(),1)
 on conflict(user_id,client_id) do update set
 calls=case when limits.window_start < clock_timestamp()-interval '1 minute' then 1 else limits.calls+1 end,
 window_start=case when limits.window_start < clock_timestamp()-interval '1 minute' then clock_timestamp() else limits.window_start end
 returning calls into count_reads;
 if count_reads>60 then raise exception 'mcp_rate_limit_exceeded'; end if;
 select workspace,updated_at into w,saved_at from public.workspaces where user_id=owner_id;
 w=coalesce(w,'{}');
 select profile into p from public.profiles where user_id=owner_id;
 p=coalesce(p,w->'profile','{}');
 mode=coalesce(p->>'aiMode','full'); if mode not in ('full','limited','manual') then mode='manual'; end if;
 if connection.share_libraries then
  for s in select value from jsonb_array_elements(coalesce(w->'songs','[]')) loop
   if s->>'blacklisted'='true' then continue; end if;
   raw=s->'review'; r=raw;
   if mode<>'full' and raw->>'status'='ai' then
    r=case when raw->'previous'->>'status' in ('manual','starter') then raw->'previous' when s->'catalogReview'->>'status'<>'ai' then s->'catalogReview' else null end;
   end if;
   r=coalesce(r,jsonb_build_object('status','unreviewed','scores',jsonb_build_object('accuracy',null,'substance',null,'language',null,'time',null),'summary','','concern','none','claims','[]'::jsonb,'concerns','[]'::jsonb,'uses','[]'::jsonb,'scriptures','[]'::jsonb,'sources','[]'::jsonb));
   if mode<>'full' then
    for item in select value from jsonb_array_elements(coalesce(r->'aiFields','[]')) loop
     if item#>>'{}'='scores' then r=r||jsonb_build_object('scores',jsonb_build_object('accuracy',null,'substance',null,'language',null,'time',null),'customScores','{}'::jsonb);
     else r=r-(item#>>'{}'); end if;
    end loop;
   end if;
   r=public.mcp_pick(r,array['status','scores','customScores','summary','concern','claims','concerns','uses','scriptures','sources','language','time','updatedAt','aiFields','model']) || public.mcp_pick(raw,array['musical','key','minutes']);
   if connection.share_notes then r=r||jsonb_build_object('notes',coalesce(raw->>'notes','')); end if;
   if mode<>'manual' and raw->'assistance' is not null then r=r||jsonb_build_object('assistance',public.mcp_pick(raw->'assistance',array['summary','language','time','model','updatedAt'])); end if;
   m=public.mcp_pick(s->'metadata',array['themes','tags','year','language','tune','meter','tempo','timeSignature','instruments','vocalDifficulty','instrumentalDifficulty','lowNote','highNote','largestLeap','wordlessSeconds','instrumentalSeconds','custom']);
   if connection.share_lyrics then m=m||public.mcp_pick(s->'metadata',array['lyrics']); end if;
   select coalesce(jsonb_agg(public.mcp_pick(a,array['id','name','key','minutes','tempo','timeSignature','lowNote','highNote','largestLeap','wordlessSeconds','instrumentalSeconds','instruments','vocalDifficulty','instrumentalDifficulty']) || case when connection.share_notes then public.mcp_pick(a,array['notes']) else '{}'::jsonb end),'[]'::jsonb) into arrangements from jsonb_array_elements(coalesce(s->'arrangements','[]')) a;
   -- Libraries expose the owner's displayed rating without exposing private
   -- profile weights when profile sharing is switched off.
   select round(sum(score * weight) / nullif(sum(weight),0),1) into account_rating
   from (
    select case when criterion->>'id' like 'custom-%' then (r->'customScores'->>(criterion->>'id'))::numeric else (r->'scores'->>(criterion->>'id'))::numeric end as score,
     coalesce((p->'weights'->>(criterion->>'id'))::numeric,case criterion->>'id' when 'accuracy' then 35 when 'substance' then 30 when 'language' then 20 when 'time' then 15 else 1 end) as weight
    from jsonb_array_elements(coalesce(p->'criteria','[{"id":"accuracy","active":true},{"id":"substance","active":true},{"id":"language","active":true},{"id":"time","active":true}]'::jsonb)) criterion
    where coalesce((criterion->>'active')::boolean,false)
   ) weighted where score is not null and weight>0;
   songs=songs||jsonb_build_array(public.mcp_pick(s,array['id','title','author','version','category','preferredArrangementId'])||jsonb_build_object('review',r,'metadata',m,'arrangements',arrangements,'account_rating',account_rating,
    'facts',(select coalesce(jsonb_object_agg(key,public.mcp_pick(value,case when connection.share_notes then array['confidence','source'] else array['confidence'] end)),'{}'::jsonb) from jsonb_each(coalesce(s->'facts','{}')) where key=any(array['author','key','tempo','minutes','timeSignature','range','tune','meter'])),
    'aiReview',case when mode='full' and s->'review'->>'status'='manual' and coalesce(s->>'aiDismissed','false')<>'true' then public.mcp_pick(coalesce(s->'aiReview',s->'catalogReview'),array['status','scores','customScores','summary','claims','concerns','uses','scriptures','sources','language','time','themes','concern','updatedAt','aiFields','model']) else '{}'::jsonb end,
    'firstLine',case when connection.share_lyrics then coalesce(s->>'firstLine','') else '' end,
    'themes',coalesce(s->'metadata'->'themes',case when mode<>'full' and (raw->>'status'='ai' or raw->'aiFields' ? 'themes') then case when s->'catalogReview'->>'status'='ai' then '[]'::jsonb else s->'catalogThemes' end else s->'themes' end,'[]'),
    'approval',public.mcp_pick(s->'approval',array['status','updatedAt'])||case when connection.share_notes then public.mcp_pick(s->'approval',array['notes']) else '{}'::jsonb end));
  end loop;
  select coalesce(jsonb_agg(public.mcp_pick(l,array['id','name'])||jsonb_build_object('songIds',(select coalesce(jsonb_agg(song_id),'[]'::jsonb) from jsonb_array_elements(coalesce(l->'songIds','[]')) song_id where not exists(select 1 from jsonb_array_elements(coalesce(w->'songs','[]')) hidden where hidden->>'id'=song_id#>>'{}' and hidden->>'blacklisted'='true')))),'[]'::jsonb) into libraries from jsonb_array_elements(coalesce(w->'libraries','[]')) l;
 end if;
 if connection.share_plans then
  for plan in select value from jsonb_array_elements(coalesce(w->'plans','[]')) loop
   items='[]';
   for item in select value from jsonb_array_elements(coalesce(plan->'items','[]')) loop
    if exists(select 1 from jsonb_array_elements(coalesce(w->'songs','[]')) hidden where hidden->>'id'=item->>'songId' and hidden->>'blacklisted'='true') then
     items=items||jsonb_build_array(public.mcp_pick(item,array['id','type','minutes','role'])||jsonb_build_object('title','Blacklisted song','song_title','Blacklisted song'));
     continue;
    end if;
    items=items||jsonb_build_array(public.mcp_pick(item,array['id','type','songId','title','role','key','minutes','arrangementId','arrangementName'])||case when connection.share_notes then public.mcp_pick(item,array['notes']) else '{}'::jsonb end||jsonb_build_object('song_title',(select a->>'title' from jsonb_array_elements(coalesce(w->'songs','[]')) a where a->>'id'=item->>'songId' limit 1)));
   end loop;
   plans=plans||jsonb_build_array(public.mcp_pick(plan,array['id','title','date','theme','passage','status'])||jsonb_build_object('items',items));
  end loop;
 end if;
 return jsonb_build_object('ai_mode',mode,'updated_at',saved_at,
 'permissions',jsonb_build_object('profile',connection.share_profile,'libraries',connection.share_libraries,'plans',connection.share_plans,'notes',connection.share_notes,'lyrics',connection.share_lyrics),
 'profile',case when connection.share_profile then public.mcp_pick(p,array['denomination','statement','customStatement','weights','criteria','principles','aiMode','aiLabels']) else '{}'::jsonb end,
 'songs',songs,'libraries',libraries,'plans',plans);
end $$;
revoke all on function public.mcp_read_snapshot() from public,anon;
grant execute on function public.mcp_read_snapshot() to authenticated;
commit;
