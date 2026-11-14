-- Vector initial schema (Phase 1 foundation).
-- Apply in Supabase Dashboard -> SQL Editor, or with the Supabase CLI.
-- The browser only ever receives the publishable/anon key. Service-role keys
-- must never be committed or shipped to the client.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Create a profile automatically for each new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects and membership
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects(owner_id, updated_at desc);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "projects_select_own"
  on public.projects for select
  using (owner_id = auth.uid());

create policy "projects_insert_own"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "projects_update_own"
  on public.projects for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "projects_delete_own"
  on public.projects for delete
  using (owner_id = auth.uid());

create policy "project_members_select_self_or_owner"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "project_members_owner_manage"
  on public.project_members for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Security-definer helper used by child-table policies. It avoids recursive
-- policies on projects while still respecting the authenticated user.
create or replace function public.can_access_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.project_members m
    where m.project_id = target_project and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- requirement documents and requirements
-- ---------------------------------------------------------------------------
create table if not exists public.requirement_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text,
  storage_path text not null,
  extracted_text text,
  page_count integer,
  status text not null default 'processing'
    check (status in ('processing', 'parsed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requirement_documents_project_idx
  on public.requirement_documents(project_id, created_at desc);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid references public.requirement_documents(id) on delete cascade,
  requirement_code text not null,
  original_text text not null,
  normalized_text text not null default '',
  kind text not null default 'functional'
    check (kind in ('functional', 'non_functional')),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'needs_clarification', 'modified')),
  priority text not null default 'medium'
    check (priority in ('critical', 'high', 'medium', 'low')),
  priority_reason text,
  source_page integer,
  source_paragraph integer,
  source_char_start integer,
  source_char_end integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, requirement_code)
);

create index if not exists requirements_project_idx
  on public.requirements(project_id, status, priority);
create index if not exists requirements_document_idx
  on public.requirements(document_id, source_page, source_char_start);

create table if not exists public.requirement_relationships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_requirement_id uuid not null references public.requirements(id) on delete cascade,
  to_requirement_id uuid not null references public.requirements(id) on delete cascade,
  type text not null check (type in ('belongs_to', 'implements', 'depends_on', 'triggers', 'conflicts_with', 'related_to')),
  confidence numeric(4,3) not null default 1.0 check (confidence between 0 and 1),
  evidence text,
  created_at timestamptz not null default now()
);

create index if not exists requirement_relationships_project_idx
  on public.requirement_relationships(project_id, type);
create index if not exists requirement_relationships_from_idx
  on public.requirement_relationships(from_requirement_id);
create index if not exists requirement_relationships_to_idx
  on public.requirement_relationships(to_requirement_id);

create table if not exists public.acceptance_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  given_text text not null,
  when_text text not null,
  then_text text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'modified')),
  source text not null default 'ai_inferred'
    check (source in ('company', 'ai_inferred', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acceptance_criteria_requirement_idx
  on public.acceptance_criteria(requirement_id, status);

-- ---------------------------------------------------------------------------
-- analysis runs, prompt versions, approvals
-- ---------------------------------------------------------------------------
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  engine text not null default 'bert',
  payload jsonb not null default '{}'::jsonb,
  risk_score integer check (risk_score between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists analysis_runs_project_idx
  on public.analysis_runs(project_id, created_at desc);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null,
  prompt_markdown text not null,
  specification jsonb not null default '{}'::jsonb,
  source_requirement_ids uuid[] not null default '{}',
  change_summary text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists prompt_versions_project_idx
  on public.prompt_versions(project_id, version desc);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  decision text not null check (decision in ('approved', 'rejected', 'needs_clarification', 'modified')),
  actor_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists approvals_project_idx
  on public.approvals(project_id, created_at desc);
create index if not exists approvals_entity_idx
  on public.approvals(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- design systems and regression/memory
-- ---------------------------------------------------------------------------
create table if not exists public.design_systems (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  component_specs jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists design_systems_owner_idx
  on public.design_systems(owner_id, updated_at desc);

create table if not exists public.design_system_versions (
  id uuid primary key default gen_random_uuid(),
  design_system_id uuid not null references public.design_systems(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (design_system_id, version)
);

create table if not exists public.regression_tests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete cascade,
  kind text not null,
  expected jsonb not null default '{}'::jsonb,
  last_result text,
  updated_at timestamptz not null default now()
);

create index if not exists regression_tests_project_idx
  on public.regression_tests(project_id, kind);

create table if not exists public.project_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

-- ---------------------------------------------------------------------------
-- child-table RLS
-- ---------------------------------------------------------------------------
alter table public.requirement_documents enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_relationships enable row level security;
alter table public.acceptance_criteria enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.approvals enable row level security;
alter table public.design_systems enable row level security;
alter table public.design_system_versions enable row level security;
alter table public.regression_tests enable row level security;
alter table public.project_memory enable row level security;

create policy "requirement_documents_project_access"
  on public.requirement_documents for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id) and uploaded_by = auth.uid());

create policy "requirements_project_access"
  on public.requirements for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "requirement_relationships_project_access"
  on public.requirement_relationships for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "acceptance_criteria_project_access"
  on public.acceptance_criteria for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "analysis_runs_project_access"
  on public.analysis_runs for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id) and user_id = auth.uid());

create policy "prompt_versions_project_access"
  on public.prompt_versions for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id) and created_by = auth.uid());

create policy "approvals_project_access"
  on public.approvals for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id) and actor_id = auth.uid());

create policy "design_systems_owner_or_project"
  on public.design_systems for all
  using (
    owner_id = auth.uid()
    or (project_id is not null and public.can_access_project(project_id))
  )
  with check (
    owner_id = auth.uid()
    or (project_id is not null and public.can_access_project(project_id))
  );

create policy "design_system_versions_owner_or_project"
  on public.design_system_versions for all
  using (
    exists (
      select 1 from public.design_systems d
      where d.id = design_system_id
        and (d.owner_id = auth.uid() or (d.project_id is not null and public.can_access_project(d.project_id)))
    )
  )
  with check (
    exists (
      select 1 from public.design_systems d
      where d.id = design_system_id
        and (d.owner_id = auth.uid() or (d.project_id is not null and public.can_access_project(d.project_id)))
    )
  );

create policy "regression_tests_project_access"
  on public.regression_tests for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

create policy "project_memory_project_access"
  on public.project_memory for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'projects', 'requirement_documents', 'requirements',
    'acceptance_criteria', 'design_systems', 'regression_tests', 'project_memory'
  ]
  loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- document storage bucket and policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('requirement-documents', 'requirement-documents', false)
on conflict (id) do nothing;

create policy "documents_project_read"
  on storage.objects for select
  using (
    bucket_id = 'requirement-documents'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_project_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'requirement-documents'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_project_update"
  on storage.objects for update
  using (
    bucket_id = 'requirement-documents'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_project_delete"
  on storage.objects for delete
  using (
    bucket_id = 'requirement-documents'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- API grants (RLS remains the row-level authority)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
