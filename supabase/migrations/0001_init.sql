-- Textprobe: Szenen, Lernfortschritt pro Replik und zuletzt gemerkte Position.
-- Alle Tabellen sind über RLS strikt an den angemeldeten Nutzer gebunden.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- Szenen
create table if not exists public.scenes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'Unbenannte Szene',
  markdown    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists scenes_user_idx on public.scenes (user_id, updated_at desc);

-- ------------------------------------------------- Fortschritt pro Replik
-- line_key stammt aus dem Parser (Hash über Sprecher + Text) und bleibt
-- damit auch stabil, wenn sich die Reihenfolge im Markdown verschiebt.
create table if not exists public.line_stats (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scene_id          uuid not null references public.scenes (id) on delete cascade,
  role_id           text not null,
  line_key          text not null,
  seen              integer not null default 0,
  known             integer not null default 0,
  forgotten         integer not null default 0,
  streak            integer not null default 0,
  last_result       text check (last_result in ('known', 'forgot')),
  last_reviewed_at  timestamptz,
  unique (user_id, scene_id, role_id, line_key)
);

create index if not exists line_stats_lookup_idx
  on public.line_stats (user_id, scene_id, role_id);

-- ------------------------------------------------- Position beim Weiterüben
create table if not exists public.study_sessions (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scene_id    uuid not null references public.scenes (id) on delete cascade,
  role_id     text not null,
  cursor      integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, scene_id, role_id)
);

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scenes_touch_updated_at on public.scenes;
create trigger scenes_touch_updated_at
  before update on public.scenes
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- RLS
alter table public.scenes          enable row level security;
alter table public.line_stats      enable row level security;
alter table public.study_sessions  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['scenes', 'line_stats', 'study_sessions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
      t || '_owner_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t || '_owner_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      t || '_owner_delete', t);
  end loop;
end;
$$;

-- ------------------------------------------- Bewertung einer Replik buchen
-- Läuft als security invoker, greift also weiterhin durch RLS.
create or replace function public.record_line_result(
  p_scene_id uuid,
  p_role_id  text,
  p_line_key text,
  p_known    boolean
)
returns public.line_stats
language sql
as $$
  insert into public.line_stats as s
    (user_id, scene_id, role_id, line_key, seen, known, forgotten, streak, last_result, last_reviewed_at)
  values
    (auth.uid(), p_scene_id, p_role_id, p_line_key, 1,
     case when p_known then 1 else 0 end,
     case when p_known then 0 else 1 end,
     case when p_known then 1 else 0 end,
     case when p_known then 'known' else 'forgot' end,
     now())
  on conflict (user_id, scene_id, role_id, line_key) do update set
    seen             = s.seen + 1,
    known            = s.known + case when p_known then 1 else 0 end,
    forgotten        = s.forgotten + case when p_known then 0 else 1 end,
    streak           = case when p_known then s.streak + 1 else 0 end,
    last_result      = case when p_known then 'known' else 'forgot' end,
    last_reviewed_at = now()
  returning s.*;
$$;
