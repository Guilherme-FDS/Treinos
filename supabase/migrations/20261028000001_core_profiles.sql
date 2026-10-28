-- Núcleo: extensões, enums, profiles, vínculo personal↔aluno, helpers de RLS.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum ('user', 'personal', 'admin');
create type public.sex as enum ('M', 'F');
create type public.occupation as enum ('escritorio', 'em_pe_leve', 'moderado', 'bracal', 'bracal_pesado');
create type public.goal as enum ('emagrecer', 'manter', 'ganhar');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  sex public.sex,
  birth_date date,
  height_cm numeric(5, 1) check (height_cm between 80 and 260),
  weight_kg numeric(5, 1) check (weight_kg between 25 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  occupation public.occupation,
  goal public.goal,
  -- % de ajuste calórico: emagrecer 15–25 (déficit), ganhar 10 (superávit), manter 0
  pace_pct numeric(4, 1) not null default 20 check (pace_pct between 0 and 25),
  protein_g_per_kg numeric(3, 1) not null default 1.8 check (protein_g_per_kg between 1.6 and 2.2),
  fat_g_per_kg numeric(3, 1) not null default 0.8 check (fat_g_per_kg between 0.6 and 1.0),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_students (
  coach_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  primary key (coach_id, student_id),
  check (coach_id <> student_id)
);

-- Helpers (security definer para não recursar nas políticas)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_coach_of(student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_students
    where coach_id = auth.uid() and student_id = student and status = 'active'
  );
$$;

create or replace function public.coach_of_me(coach uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_students
    where coach_id = coach and student_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Impede auto-promoção de papel
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL direto/service role (fora de requisição de usuário)
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'apenas admin pode alterar role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
for each row execute function public.guard_profile_role();

-- Cria profile ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.coach_students enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_coach_of(id) or public.coach_of_me(id) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Personal convida (pending); aluno aceita (active) ou qualquer lado remove.
create policy coach_students_select on public.coach_students for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy coach_students_insert on public.coach_students for insert to authenticated
  with check (
    coach_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('personal', 'admin'))
  );
create policy coach_students_update on public.coach_students for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy coach_students_delete on public.coach_students for delete to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid());

-- Personal convida aluno por e-mail sem expor a tabela profiles
create or replace function public.invite_student(student_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('personal', 'admin')) then
    raise exception 'apenas personal pode convidar alunos';
  end if;
  select id into sid from profiles where lower(email) = lower(student_email);
  if sid is null then
    raise exception 'usuário não encontrado';
  end if;
  insert into coach_students (coach_id, student_id) values (auth.uid(), sid)
  on conflict do nothing;
  return sid;
end;
$$;

grant execute on function public.invite_student(text) to authenticated;

-- Wrapper imutável para índices/colunas geradas
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict
set search_path = public, extensions as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;
