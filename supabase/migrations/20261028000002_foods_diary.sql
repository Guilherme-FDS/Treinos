-- Alimentos, diário alimentar, água e peso.

create type public.food_source as enum ('taco', 'off', 'usda', 'manual', 'ai');
create type public.meal_type as enum ('cafe', 'almoco', 'lanche', 'jantar', 'ceia');

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  brand text,
  barcode text unique,
  food_group text,
  base_g numeric(6, 1) not null default 100 check (base_g > 0),
  kcal numeric(7, 1) not null check (kcal >= 0),
  protein numeric(6, 2) check (protein >= 0),
  carbs numeric(6, 2) check (carbs >= 0), -- carboidrato total (inclui fibra, como na TACO)
  fat numeric(6, 2) check (fat >= 0),
  fiber numeric(6, 2) check (fiber >= 0),
  sodium_mg numeric(8, 1) check (sodium_mg >= 0),
  serving_g numeric(6, 1) check (serving_g > 0),
  serving_label text,
  source public.food_source not null default 'manual',
  source_ref text,
  source_url text,
  verified boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('portuguese', public.f_unaccent(coalesce(name, '') || ' ' || coalesce(brand, '')))
  ) stored,
  unique (source, source_ref)
);

create index foods_search_idx on public.foods using gin (search);
create index foods_name_trgm_idx on public.foods using gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);
create index foods_created_by_idx on public.foods (created_by);

alter table public.foods enable row level security;

-- source != manual: público. manual: só criador até verified=true.
create policy foods_select on public.foods for select to authenticated
  using (source <> 'manual' or verified or created_by = auth.uid() or public.is_admin());
create policy foods_insert on public.foods for insert to authenticated
  with check (
    (created_by = auth.uid() and verified = false and source in ('manual', 'off', 'ai'))
    or public.is_admin()
  );
create policy foods_update on public.foods for update to authenticated
  using ((created_by = auth.uid() and verified = false) or public.is_admin())
  with check ((created_by = auth.uid() and verified = false) or public.is_admin());
create policy foods_delete on public.foods for delete to authenticated
  using ((created_by = auth.uid() and verified = false) or public.is_admin());

-- Busca full text (prefixo, sem acento, pt) + fallback trigram. security invoker → respeita RLS.
create or replace function public.search_foods(q text, lim int default 20)
returns setof public.foods
language sql stable security invoker set search_path = public, extensions as $$
  with norm as (
    select public.f_unaccent(lower(trim(q))) as t
  ),
  tsq as (
    select case when (select t from norm) = '' then null else
      to_tsquery('portuguese', (
        select string_agg(w || ':*', ' & ')
        from regexp_split_to_table(regexp_replace((select t from norm), '[^a-z0-9 ]', ' ', 'g'), '\s+') w
        where w <> ''
      ))
    end as query
  )
  select f.*
  from public.foods f, tsq, norm
  where (tsq.query is not null and f.search @@ tsq.query)
     or public.f_unaccent(lower(f.name)) % norm.t
  order by
    (f.source = 'taco') desc,
    (case when tsq.query is null then 0 else ts_rank(f.search, tsq.query) end) desc,
    similarity(public.f_unaccent(lower(f.name)), norm.t) desc,
    length(f.name)
  limit least(greatest(lim, 1), 50);
$$;

grant execute on function public.search_foods(text, int) to authenticated;

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  eaten_on date not null,
  meal_type public.meal_type not null,
  is_favorite boolean not null default false,
  favorite_name text,
  created_at timestamptz not null default now(),
  unique (user_id, eaten_on, meal_type)
);

create index meals_user_favorite_idx on public.meals (user_id) where is_favorite;

-- Snapshot dos macros: não depende de alterações futuras em foods.
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null,
  grams numeric(7, 1) not null check (grams > 0),
  serving_qty numeric(6, 2),
  serving_label text,
  kcal numeric(7, 1) not null,
  protein numeric(6, 2),
  carbs numeric(6, 2),
  fat numeric(6, 2),
  fiber numeric(6, 2),
  sodium_mg numeric(8, 1),
  created_at timestamptz not null default now()
);

create index meal_items_meal_idx on public.meal_items (meal_id);
create index meal_items_user_idx on public.meal_items (user_id);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  logged_on date not null,
  ml integer not null check (ml between 1 and 5000),
  logged_at timestamptz not null default now()
);

create index water_logs_user_day_idx on public.water_logs (user_id, logged_on);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  logged_on date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 25 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

-- Metas vigentes a partir de effective_from (meta do dia D = última com effective_from <= D).
-- Parte fixa: basal, NEAT e metas base. Treino/TEF do dia somados no dashboard.
create table public.daily_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  effective_from date not null,
  weight_kg numeric(5, 1) not null,
  bmr_kcal numeric(7, 1) not null,
  bmr_formula text not null check (bmr_formula in ('mifflin', 'katch')),
  activity_factor numeric(4, 3) not null,
  maintenance_kcal numeric(7, 1) not null, -- (basal*fator)/0.9 → inclui TEF
  target_kcal numeric(7, 1) not null,
  adjust_pct numeric(4, 1) not null,
  protein_g numeric(6, 1) not null,
  fat_g numeric(6, 1) not null,
  carbs_g numeric(6, 1) not null,
  water_ml integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.daily_targets enable row level security;

-- Dono faz tudo; personal com vínculo ativo só lê.
create policy meals_owner on public.meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meals_coach_read on public.meals for select to authenticated
  using (public.is_coach_of(user_id));

create policy meal_items_owner on public.meal_items for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );
create policy meal_items_coach_read on public.meal_items for select to authenticated
  using (public.is_coach_of(user_id));

create policy water_logs_owner on public.water_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy weight_logs_owner on public.weight_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy weight_logs_coach_read on public.weight_logs for select to authenticated
  using (public.is_coach_of(user_id));

create policy daily_targets_owner on public.daily_targets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_targets_coach_read on public.daily_targets for select to authenticated
  using (public.is_coach_of(user_id));
