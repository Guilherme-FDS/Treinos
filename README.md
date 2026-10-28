# Treinos

Plataforma web (PWA, mobile-first) de controle de dieta, treino, gasto energético e água. Multiusuário, com papéis `user | personal | admin`.

Stack: Next.js 16 (App Router, TS) · Tailwind 4 · Supabase (Auth, Postgres, RLS, Storage) · Zod · Vitest.

## Setup

Pré-requisitos: Node 22+, Docker (para o Supabase local) e Supabase CLI (`npx supabase`).

```bash
npm install
cp .env.example .env.local
npx supabase start          # sobe Postgres/Auth/Storage locais e aplica supabase/migrations
npx supabase status         # copie API URL, anon key e service_role key para .env.local
npm run import:taco         # 591 alimentos da TACO 4ª ed. → foods
npm run seed:exercises      # METs do Compendium + exercícios do wger (CC-BY-SA)
npm run dev                 # http://localhost:3000
```

- Reaplicar migrations do zero: `npm run db:reset` (depois rode o import e o seed de novo).
- Google OAuth: preencha `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET` (lidos pelo `supabase/config.toml`); redirect `http://127.0.0.1:54321/auth/v1/callback`. Em produção, configure o provider no painel do Supabase e adicione `<site>/auth/callback` nas Redirect URLs.
- Promover alguém a personal/admin (SQL editor): `update profiles set role = 'personal' where email = '...';` (o trigger impede auto-promoção via API).
- `seed:exercises -- --no-wger` pula o download do wger.

## Scripts

| comando | o que faz |
|---|---|
| `npm test` | Vitest (`lib/calc`, parsers, schemas, normalizadores) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `bash supabase/tests/run.sh` | aplica migrations num Postgres puro (stub de auth/storage) e roda os testes de RLS |

## Estrutura

```
app/
  (auth)/            login, signup, forgot/reset-password + server actions
  auth/callback      troca code OAuth/PKCE por sessão; auth/confirm (token_hash)
  onboarding/        perfil inicial → metas
  (app)/             área logada (layout exige onboarding + bottom nav)
    dashboard/       consumido vs meta, gasto (basal/NEAT/treino/TEF), saldo, semana, peso
    diary/           refeições do dia, favoritas, repetir dia anterior, água; add/ = busca + porção
    foods/           busca em cascata + scanner, detalhe com validação, cadastro manual
    exercises/       biblioteca, exercício próprio com vídeo, histórico/recordes
    workouts/        fichas (CRUD, drag and drop, duplicar), run/ (execução), activity/ (cardio por MET)
    coach/           personal: convidar aluno, criar ficha atribuída
    profile/         dados, registro de peso, convites de personal
  api/foods/         search (cascata), barcode/[code], ai-lookup (stub Fase 2)
components/          UI, scanner, busca, charts (Recharts), forms
lib/
  calc/              cálculos puros + testes (energy, training, targets, nutrition, plan, history)
  actions/           server actions por domínio (Zod em toda entrada)
  supabase/          clientes browser/server e refresh de sessão do proxy
  off.ts foods.ts    Open Food Facts + cascata/cache
  exercises/         Compendium (METs) e normalizador do wger
  schemas.ts types.ts targets.ts day.ts dates.ts video.ts
proxy.ts             (antigo middleware) protege rotas e renova sessão
scripts/             import-taco.ts, seed-exercises.ts, parse-taco-pdf.py
supabase/migrations  schema + RLS + bucket exercise-videos
public/sw.js         service worker (assets + página offline)
```

## Banco

Tabelas (todas com RLS): `profiles`, `coach_students`, `weight_logs`, `foods`, `meals`, `meal_items`, `exercises`, `workout_templates`, `workout_template_items`, `workouts`, `workout_sets`, `water_logs`, `daily_targets`.

- Dono (`user_id = auth.uid()`) tem acesso total aos próprios registros; personal com vínculo **ativo** só lê os do aluno.
- `foods`: `source != 'manual'` é público; `manual` só para o criador até `verified = true`. Usuários só inserem `manual/off/ai` com `verified = false`; TACO entra pelo script com service role.
- `meal_items` guarda snapshot de kcal/macros — mudar `foods` não altera o histórico.
- `exercises.created_by = null` é global; exercício de um personal é visível aos alunos dele.
- Fichas: dono edita; `assigned_to` (aluno) só lê e pode duplicar.
- `daily_targets`: metas base vigentes a partir de `effective_from`, recalculadas ao salvar perfil ou registrar peso.
- Busca: `search_foods(q)` usa tsvector `portuguese` + `unaccent` com prefixo, mais fallback trigram.
- Storage: bucket `exercise-videos` (público para leitura, 50 MB, mp4/webm), upload em `<uid>/…`.

## Cálculos (`lib/calc`)

- Basal: Mifflin-St Jeor; com %gordura, Katch-McArdle `370 + 21.6 × massa magra`.
- Fator ocupacional (NEAT): escritório 1.2 · em pé leve 1.375 · moderado 1.55 · braçal 1.725 · braçal pesado 1.9.
- Treino: `MET × peso × horas`. Musculação: MET 3.5/5.0/6.0, intensidade inferida por descanso, reps e séries/hora; a tonelagem relativa só ajusta ±0.3 MET e o resultado fica entre 3.5 e 6.0.
- TEF = 10% do ingerido. GET = basal × fator + treinos + TEF.
- Meta: manutenção `I = (basal × fator + treino) / 0.9` (inclui o TEF da própria ingestão); déficit 15–25%, manter 0, ganhar +10%.
- Macros: proteína 1.6–2.2 g/kg, gordura 0.6–1.0 g/kg, carbo = restante (se faltar kcal, gordura e depois proteína descem até o mínimo).
- Água: 35 ml/kg + 500 ml por hora de treino.
- Validação de alimento: `4P + 4(C − fibra) + 2·fibra + 9G`; divergência > 15% (e ≥ 10 kcal) marca "kcal suspeita" (nunca para TACO).

## Fontes e licenças

- TACO 4ª ed. (NEPA/Unicamp): `data/taco.csv`, gerado por `scripts/parse-taco-pdf.py`. Carboidrato = total (inclui fibra).
- Open Food Facts (ODbL): busca por barcode e por nome com `countries_tags:en:brazil`; resultados ficam em `foods` como `source='off', verified=false`. Defina `OFF_USER_AGENT`.
- wger (CC-BY-SA 4.0): nome, grupo, equipamento, imagem e vídeo; atribuição em `exercises.attribution`, exibida na página do exercício.
- Compendium of Physical Activities: METs em `lib/exercises/compendium.ts` (código de referência em `source_url`).

## Fase 2 (preparado, não implementado)

- `POST /api/foods/ai-lookup` retorna 501. Schema de saída em `lib/ai-food.ts` (`source='ai', verified=false`); a implementação chama a API da Anthropic com web search no server (`ANTHROPIC_API_KEY`) e passa por `checkKcal` antes de salvar.
- OCR de tabela nutricional: mesmo fluxo (foto → JSON `aiFoodSchema` → validação → `foods`).
