-- Testes de RLS (rodam como role authenticated simulando JWT). Falha = exception.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'aluno@x.com'),
  ('00000000-0000-0000-0000-00000000000b', 'outro@x.com'),
  ('00000000-0000-0000-0000-00000000000c', 'personal@x.com');
update public.profiles set role = 'personal' where id = '00000000-0000-0000-0000-00000000000c';

insert into public.foods (name, kcal, source, source_ref, verified)
values ('Arroz TACO', 128, 'taco', '3', true);

create or replace function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true), set_config('request.jwt.claim.role', 'authenticated', true);
$$;

set local role authenticated;

-- A: cria alimento manual, refeição e item
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
insert into public.foods (name, kcal, source, created_by)
values ('Bolo da vó', 300, 'manual', '00000000-0000-0000-0000-00000000000a');
insert into public.meals (id, user_id, eaten_on, meal_type)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2026-10-28', 'cafe');
insert into public.meal_items (meal_id, user_id, food_name, grams, kcal)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Bolo', 50, 150);

do $$ begin
  if (select count(*) from public.foods) <> 2 then raise exception 'A deveria ver 2 foods'; end if;
  if (select count(*) from public.search_foods('arroz')) <> 1 then raise exception 'search_foods falhou'; end if;
end $$;

-- A não pode se promover
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'role escalou!';
  exception when others then
    if sqlerrm = 'role escalou!' then raise; end if;
  end;
end $$;

-- A não pode criar alimento verified/taco
do $$ begin
  begin
    insert into public.foods (name, kcal, source, created_by, verified)
    values ('Fake', 1, 'taco', auth.uid(), true);
    raise exception 'insert taco permitido!';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B: não vê manual de A nem refeição de A
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.foods) <> 1 then raise exception 'B viu alimento manual de A'; end if;
  if (select count(*) from public.meals) <> 0 then raise exception 'B viu meals de A'; end if;
  if (select count(*) from public.meal_items) <> 0 then raise exception 'B viu meal_items de A'; end if;
end $$;

-- B não pode inserir item na refeição de A
do $$ begin
  begin
    insert into public.meal_items (meal_id, user_id, food_name, grams, kcal)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'x', 1, 1);
    raise exception 'B inseriu em meal de A!';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B (user) não pode convidar
do $$ begin
  begin
    perform public.invite_student('aluno@x.com');
    raise exception 'user convidou!';
  exception when others then
    if sqlerrm = 'user convidou!' then raise; end if;
  end;
end $$;

-- C (personal): convida A; sem aceite não pode atribuir ficha
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select public.invite_student('aluno@x.com');
do $$ begin
  begin
    insert into public.workout_templates (owner_id, assigned_to, name)
    values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'Treino A');
    raise exception 'atribuiu sem vínculo ativo!';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.meals) <> 0 then raise exception 'C viu meals sem vínculo'; end if;
end $$;

-- A aceita
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
update public.coach_students set status = 'active' where student_id = auth.uid();

-- C cria exercício próprio + ficha atribuída a A
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
insert into public.exercises (id, name, source, created_by)
values ('20000000-0000-0000-0000-000000000001', 'Supino do personal', 'user', '00000000-0000-0000-0000-00000000000c');
insert into public.workout_templates (id, owner_id, assigned_to, name)
values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'Treino A');
insert into public.workout_template_items (template_id, exercise_id, position)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 0);
do $$ begin
  if (select count(*) from public.meals) <> 1 then raise exception 'C (ativo) deveria ler meals de A'; end if;
end $$;

-- A vê ficha, item e exercício do personal; não edita a ficha
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  if (select count(*) from public.workout_templates) <> 1 then raise exception 'A não vê ficha'; end if;
  if (select count(*) from public.workout_template_items) <> 1 then raise exception 'A não vê itens'; end if;
  if (select count(*) from public.exercises) <> 1 then raise exception 'A não vê exercício do personal'; end if;
end $$;
update public.workout_templates set name = 'hack';
do $$ begin
  if exists (select 1 from public.workout_templates where name = 'hack') then raise exception 'A editou ficha do personal'; end if;
end $$;

-- B não vê exercício do personal
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.exercises) <> 0 then raise exception 'B viu exercício alheio'; end if;
  if (select count(*) from public.workout_templates) <> 0 then raise exception 'B viu ficha alheia'; end if;
end $$;

rollback;
