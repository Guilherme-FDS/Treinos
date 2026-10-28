-- Exercícios, fichas de treino, treinos executados e storage de vídeos.

create type public.exercise_type as enum ('musculacao', 'cardio', 'esporte', 'mobilidade');
create type public.training_method as enum ('normal', 'bi-set', 'drop-set', 'piramide');
create type public.intensity as enum ('light', 'moderate', 'vigorous');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  muscle_group text,
  equipment text,
  type public.exercise_type not null default 'musculacao',
  met_light numeric(4, 1) check (met_light > 0),
  met_moderate numeric(4, 1) check (met_moderate > 0),
  met_vigorous numeric(4, 1) check (met_vigorous > 0),
  instructions text,
  video_url text,
  image_url text,
  source text not null default 'user', -- compendium | wger | user
  source_ref text,
  source_url text,
  license text,
  attribution text,
  created_by uuid references public.profiles (id) on delete cascade, -- null = global
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('portuguese', public.f_unaccent(coalesce(name, '') || ' ' || coalesce(muscle_group, '')))
  ) stored,
  unique (source, source_ref)
);

create index exercises_search_idx on public.exercises using gin (search);
create index exercises_created_by_idx on public.exercises (created_by);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  goal text,
  weekdays smallint[] not null default '{}', -- 0=dom … 6=sáb
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

create trigger workout_templates_updated_at before update on public.workout_templates
for each row execute function public.set_updated_at();

create table public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null default 0,
  sets smallint not null default 3 check (sets between 1 and 20),
  reps_min smallint check (reps_min between 1 and 100),
  reps_max smallint check (reps_max between 1 and 100),
  load_kg numeric(6, 2) check (load_kg >= 0),
  rest_s smallint check (rest_s between 0 and 900),
  method public.training_method not null default 'normal',
  notes text,
  check (reps_max is null or reps_min is null or reps_max >= reps_min)
);

create index workout_template_items_template_idx on public.workout_template_items (template_id, position);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  template_id uuid references public.workout_templates (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null, -- atividade única (cardio/esporte)
  name text not null,
  performed_on date not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_min numeric(5, 1) not null check (duration_min > 0 and duration_min <= 600),
  type public.exercise_type not null default 'musculacao',
  intensity public.intensity,
  met numeric(4, 1) not null check (met > 0),
  weight_kg numeric(5, 1) not null,
  kcal numeric(7, 1) not null, -- MET * peso * horas (snapshot)
  notes text,
  created_at timestamptz not null default now()
);

create index workouts_user_day_idx on public.workouts (user_id, performed_on);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_index smallint not null,
  reps smallint check (reps between 0 and 200),
  load_kg numeric(6, 2) check (load_kg >= 0),
  rest_s smallint,
  done boolean not null default true,
  done_at timestamptz default now()
);

create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, done_at desc);
create index workout_sets_workout_idx on public.workout_sets (workout_id);

alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_items enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

-- Exercícios: globais + próprios + do meu personal (para fichas atribuídas)
create policy exercises_select on public.exercises for select to authenticated
  using (created_by is null or created_by = auth.uid() or public.coach_of_me(created_by) or public.is_admin());
create policy exercises_insert on public.exercises for insert to authenticated
  with check ((created_by = auth.uid() and source = 'user') or public.is_admin());
create policy exercises_update on public.exercises for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy exercises_delete on public.exercises for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Fichas: dono edita; aluno atribuído só lê.
create policy workout_templates_select on public.workout_templates for select to authenticated
  using (owner_id = auth.uid() or assigned_to = auth.uid());
create policy workout_templates_insert on public.workout_templates for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (assigned_to is null or assigned_to = auth.uid() or public.is_coach_of(assigned_to))
  );
create policy workout_templates_update on public.workout_templates for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (assigned_to is null or assigned_to = auth.uid() or public.is_coach_of(assigned_to))
  );
create policy workout_templates_delete on public.workout_templates for delete to authenticated
  using (owner_id = auth.uid());

create policy workout_template_items_select on public.workout_template_items for select to authenticated
  using (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and (t.owner_id = auth.uid() or t.assigned_to = auth.uid())
  ));
create policy workout_template_items_write on public.workout_template_items for all to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.owner_id = auth.uid()));

create policy workouts_owner on public.workouts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_coach_read on public.workouts for select to authenticated
  using (public.is_coach_of(user_id));

create policy workout_sets_owner on public.workout_sets for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy workout_sets_coach_read on public.workout_sets for select to authenticated
  using (public.is_coach_of(user_id));

-- Storage: vídeos de exercício (público para leitura; upload em <uid>/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-videos', 'exercise-videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy exercise_videos_read on storage.objects for select
  using (bucket_id = 'exercise-videos');
create policy exercise_videos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy exercise_videos_update on storage.objects for update to authenticated
  using (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy exercise_videos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text);
