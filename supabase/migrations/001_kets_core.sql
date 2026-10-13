-- v1 DRAFT: apply to a dedicated Supabase TEST project first.
-- Browser authentication, RPC validation, Storage policies and RLS integration tests remain separate.
begin;
create table public.kets_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null,
 created_at timestamptz not null default now()
);
create table public.kets_memberships (
 workspace_id uuid not null references public.kets_workspaces(id),
 user_id uuid not null references auth.users(id),
 role text not null check (role in ('viewer','editor','admin')),
 primary key (workspace_id,user_id)
);
alter table public.kets_memberships enable row level security;
revoke all on public.kets_memberships from anon, authenticated;
grant select on public.kets_memberships to authenticated;
create policy memberships_self on public.kets_memberships for select to authenticated using (user_id=(select auth.uid()));
-- Only a trusted backend/database administrator may add or promote members.
create function public.kets_has_role(w uuid, allowed text[])
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.kets_memberships m where m.workspace_id=w and m.user_id=(select auth.uid()) and m.role=any(allowed)); $$;
revoke all on function public.kets_has_role(uuid,text[]) from public,anon;
grant execute on function public.kets_has_role(uuid,text[]) to authenticated;
alter table public.kets_workspaces enable row level security;
revoke all on public.kets_workspaces from anon,authenticated;
grant select on public.kets_workspaces to authenticated;
create policy workspace_member_read on public.kets_workspaces for select to authenticated using (public.kets_has_role(id,ARRAY['viewer','editor','admin']));
create table public.kets_audit_log (
 audit_id bigint generated always as identity primary key,
 workspace_id uuid not null references public.kets_workspaces(id),
 table_name text not null, row_id text, operation text not null,
 actor uuid, occurred_at timestamptz not null default now(),
 before_row jsonb, after_row jsonb
);
alter table public.kets_audit_log enable row level security;
revoke all on public.kets_audit_log from anon,authenticated;
grant select on public.kets_audit_log to authenticated;
create policy audit_admin_read on public.kets_audit_log for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['admin']));
create function public.kets_audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 r := case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
 insert into public.kets_audit_log(workspace_id,table_name,row_id,operation,actor,before_row,after_row)
 values ((r->>'workspace_id')::uuid,TG_TABLE_NAME,r->>'id',TG_OP,auth.uid(),case when TG_OP='INSERT' then null else to_jsonb(OLD) end,case when TG_OP='DELETE' then null else to_jsonb(NEW) end);
 return coalesce(NEW,OLD);
end; $$;
revoke all on function public.kets_audit_change() from public,anon,authenticated;
create function public.kets_reject_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Append-only event history; append a supported correction event instead'; end; $$;
revoke all on function public.kets_reject_mutation() from public,anon,authenticated;
create function public.kets_keep_workspace() returns trigger language plpgsql set search_path='' as $$
begin if NEW.workspace_id<>OLD.workspace_id then raise exception 'workspace_id is immutable'; end if; return NEW; end; $$;
revoke all on function public.kets_keep_workspace() from public,anon,authenticated;
create table public.kets_sources (
 workspace_id uuid not null references public.kets_workspaces(id),
 id text not null,
 label text not null,
 url text,
 kind text not null check (kind in ('official','manual','demo')),
 access text not null check (access in ('public','internal')),
 retrieved_on date not null,
 file_sha256 text,
 primary key(workspace_id,id)
);
alter table public.kets_sources enable row level security;
revoke all on public.kets_sources from anon,authenticated;
grant select,insert on public.kets_sources to authenticated;
create policy read_member on public.kets_sources for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['viewer','editor','admin']));
create policy insert_editor on public.kets_sources for insert to authenticated with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create trigger audit_rows after insert or update or delete on public.kets_sources for each row execute function public.kets_audit_change();
create trigger keep_workspace before update on public.kets_sources for each row execute function public.kets_keep_workspace();
grant update on public.kets_sources to authenticated;
create policy update_editor on public.kets_sources for update to authenticated using(public.kets_has_role(workspace_id,ARRAY['editor','admin'])) with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create table public.kets_methodologies (
 workspace_id uuid not null references public.kets_workspaces(id),
 id text not null,
 code text not null,
 name text not null,
 scope text not null check (scope in ('industry','transition','other','unclassified')),
 scope_basis text not null,
 official_sector text not null,
 technology text not null,
 first_registered_on date,
 registration_confirmed_on date,
 recorded_on date not null,
 source_id text not null,
 public_allowed boolean default false not null,
 primary key(workspace_id,id),
 foreign key(workspace_id,source_id) references public.kets_sources(workspace_id,id),
 unique(workspace_id,code)
);
alter table public.kets_methodologies enable row level security;
revoke all on public.kets_methodologies from anon,authenticated;
grant select,insert on public.kets_methodologies to authenticated;
create policy read_member on public.kets_methodologies for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['viewer','editor','admin']));
create policy insert_editor on public.kets_methodologies for insert to authenticated with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create trigger audit_rows after insert or update or delete on public.kets_methodologies for each row execute function public.kets_audit_change();
create trigger keep_workspace before update on public.kets_methodologies for each row execute function public.kets_keep_workspace();
grant update on public.kets_methodologies to authenticated;
create policy update_editor on public.kets_methodologies for update to authenticated using(public.kets_has_role(workspace_id,ARRAY['editor','admin'])) with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create table public.kets_versions (
 workspace_id uuid not null references public.kets_workspaces(id),
 id text not null,
 methodology_id text not null,
 version text not null,
 change_type text not null check (change_type in ('new','revision')),
 registered_on date,
 effective_from date,
 recorded_on date not null,
 source_id text not null,
 primary key(workspace_id,id),
 foreign key(workspace_id,source_id) references public.kets_sources(workspace_id,id),
 foreign key(workspace_id,methodology_id) references public.kets_methodologies(workspace_id,id),
 unique(workspace_id,methodology_id,version)
);
alter table public.kets_versions enable row level security;
revoke all on public.kets_versions from anon,authenticated;
grant select,insert on public.kets_versions to authenticated;
create policy read_member on public.kets_versions for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['viewer','editor','admin']));
create policy insert_editor on public.kets_versions for insert to authenticated with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create trigger audit_rows after insert or update or delete on public.kets_versions for each row execute function public.kets_audit_change();
create trigger keep_workspace before update on public.kets_versions for each row execute function public.kets_keep_workspace();
grant update on public.kets_versions to authenticated;
create policy update_editor on public.kets_versions for update to authenticated using(public.kets_has_role(workspace_id,ARRAY['editor','admin'])) with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create table public.kets_applications (
 workspace_id uuid not null references public.kets_workspaces(id),
 id text not null,
 methodology_id text,
 title text not null,
 type text not null check (type in ('new','revision')),
 scope text not null check (scope in ('industry','transition','other','unclassified')),
 submitted_on date not null,
 recorded_on date not null,
 owner text not null,
 source_id text not null,
 public_allowed boolean default false not null,
 primary key(workspace_id,id),
 foreign key(workspace_id,source_id) references public.kets_sources(workspace_id,id),
 foreign key(workspace_id,methodology_id) references public.kets_methodologies(workspace_id,id),
 check(type<>'revision' or methodology_id is not null),
 check(recorded_on>=submitted_on),
 check(public_allowed=false)
);
alter table public.kets_applications enable row level security;
revoke all on public.kets_applications from anon,authenticated;
grant select,insert on public.kets_applications to authenticated;
create policy read_member on public.kets_applications for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['viewer','editor','admin']));
create policy insert_editor on public.kets_applications for insert to authenticated with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create trigger audit_rows after insert or update or delete on public.kets_applications for each row execute function public.kets_audit_change();
create trigger keep_workspace before update on public.kets_applications for each row execute function public.kets_keep_workspace();
grant update on public.kets_applications to authenticated;
create policy update_editor on public.kets_applications for update to authenticated using(public.kets_has_role(workspace_id,ARRAY['editor','admin'])) with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create table public.kets_status_events (
 workspace_id uuid not null references public.kets_workspaces(id),
 id text not null,
 methodology_id text not null,
 sequence integer not null check(sequence between 1 and 99999),
 occurred_on date not null,
 recorded_on date not null,
 status text not null check (status in ('active','inactive','unknown')),
 source_id text not null,
 primary key(workspace_id,id),
 foreign key(workspace_id,source_id) references public.kets_sources(workspace_id,id),
 foreign key(workspace_id,methodology_id) references public.kets_methodologies(workspace_id,id),
 unique(workspace_id,sequence),
 check(recorded_on>=occurred_on)
);
alter table public.kets_status_events enable row level security;
revoke all on public.kets_status_events from anon,authenticated;
grant select,insert on public.kets_status_events to authenticated;
create policy read_member on public.kets_status_events for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['viewer','editor','admin']));
create policy insert_editor on public.kets_status_events for insert to authenticated with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create trigger audit_rows after insert or update or delete on public.kets_status_events for each row execute function public.kets_audit_change();
create trigger keep_workspace before update on public.kets_status_events for each row execute function public.kets_keep_workspace();
create trigger immutable_history before update or delete on public.kets_status_events for each row execute function public.kets_reject_mutation();
create index kets_status_events_asof_idx on public.kets_status_events(workspace_id,occurred_on,recorded_on,sequence);
create table public.kets_review_events (
 workspace_id uuid not null references public.kets_workspaces(id),
 id text not null,
 application_id text not null,
 sequence integer not null check(sequence between 1 and 99999),
 occurred_on date not null,
 recorded_on date not null,
 stage text not null check (stage in ('draft','submitted','review','consultation','committee','approved','registered','rejected','withdrawn')),
 action text not null check (action in ('transition','supplement_requested','supplement_received','note')),
 waiting boolean default false not null,
 official_status_text text not null,
 source_id text not null,
 note text not null,
 next_action text not null,
 due_on date,
 primary key(workspace_id,id),
 foreign key(workspace_id,source_id) references public.kets_sources(workspace_id,id),
 foreign key(workspace_id,application_id) references public.kets_applications(workspace_id,id),
 unique(workspace_id,sequence),
 check(recorded_on>=occurred_on)
);
alter table public.kets_review_events enable row level security;
revoke all on public.kets_review_events from anon,authenticated;
grant select,insert on public.kets_review_events to authenticated;
create policy read_member on public.kets_review_events for select to authenticated using(public.kets_has_role(workspace_id,ARRAY['viewer','editor','admin']));
create policy insert_editor on public.kets_review_events for insert to authenticated with check(public.kets_has_role(workspace_id,ARRAY['editor','admin']));
create trigger audit_rows after insert or update or delete on public.kets_review_events for each row execute function public.kets_audit_change();
create trigger keep_workspace before update on public.kets_review_events for each row execute function public.kets_keep_workspace();
create trigger immutable_history before update or delete on public.kets_review_events for each row execute function public.kets_reject_mutation();
create index kets_review_events_asof_idx on public.kets_review_events(workspace_id,occurred_on,recorded_on,sequence);
commit;
