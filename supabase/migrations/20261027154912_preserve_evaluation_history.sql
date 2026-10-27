-- Preserve report archives when an older cached client omits the new field.
-- Explicit arrays (including [] after a human deletion) remain authoritative.
-- Existing row policies, organization roles and revision checks are unchanged.
begin;
create or replace function public.keep_evaluation_history() returns trigger
language plpgsql set search_path='' as $$
begin
  if not (new.workspace ? 'evaluationHistory') and old.workspace ? 'evaluationHistory' then
    new.workspace:=jsonb_set(new.workspace,'{evaluationHistory}',old.workspace->'evaluationHistory');
  end if;
  if new.workspace ? 'evaluationHistory' then
    if jsonb_typeof(new.workspace->'evaluationHistory') is distinct from 'array' then
      raise exception 'Evaluation History must be an array.';
    end if;
    if jsonb_array_length(new.workspace->'evaluationHistory')>100 or
      octet_length((new.workspace->'evaluationHistory')::text)>2097152 then
      raise exception 'Evaluation History is full. Download or remove older reports first.';
    end if;
    if pg_column_size(new.workspace)>5242880 then
      raise exception 'The workspace is too large to retain its evaluation reports safely.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.keep_evaluation_history() from public,anon,authenticated;
drop trigger if exists evaluation_history_preserve on public.workspaces;
create trigger evaluation_history_preserve before update on public.workspaces
  for each row execute function public.keep_evaluation_history();
drop trigger if exists evaluation_history_preserve on public.organization_workspaces;
create trigger evaluation_history_preserve before update on public.organization_workspaces
  for each row execute function public.keep_evaluation_history();
commit;
