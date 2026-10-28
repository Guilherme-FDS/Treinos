Projeto: plataforma web de controle de dieta, treino, gasto energético e água. Multiusuário. Repo já contém /data/taco.csv (TACO 4ª ed., 597 alimentos, por 100 g) e /scripts/parse-taco-pdf.py (origem do CSV).

STACK
- Next.js (App Router, TypeScript) + Tailwind, PWA (mobile-first)
- Supabase: Auth (email/senha + Google), Postgres, RLS em todas as tabelas por user_id
- Supabase CLI com migrations versionadas em /supabase/migrations
- Validação com Zod; cálculos em /lib/calc puro e testado (Vitest)

FASE 1 (implementar agora)
1. Auth: cadastro, login, logout, recuperação de senha, middleware protegendo rotas. Papéis: user | personal | admin (coluna role em profiles).
2. Onboarding/perfil: sexo, data nascimento, altura (cm), peso (kg), %gordura (opcional), ocupação, objetivo (emagrecer/manter/ganhar), ritmo do déficit/superávit
3. Cálculos (/lib/calc):
   - Basal Mifflin-St Jeor: H = 10*peso + 6.25*altura - 5*idade + 5; M = ... - 161
   - Se %gordura informado: Katch-McArdle = 370 + 21.6*massa_magra
   - Fator ocupacional (NEAT, sem treino): escritorio 1.2 | em_pe_leve 1.375 | moderado 1.55 | bracal 1.725 | bracal_pesado 1.9
   - Gasto treino = MET * peso * horas (MET da tabela exercises)
   - Musculação: MET base 3.5 leve / 5.0 moderada / 6.0 vigorosa; intensidade inferida de séries, reps, carga e descanso (tonelagem só como modificador, sem superestimar)
   - TEF = 10% das kcal ingeridas
   - GET diário = basal*fator + treinos do dia + TEF
   - Meta kcal: déficit 15-25% (emagrecer), 0 (manter), +10% (ganhar)
   - Macros: proteína 1.6-2.2 g/kg, gordura 0.6-1 g/kg, carbo = restante
   - Água: 35 ml/kg + 500 ml por hora de treino
   - Recalcular metas ao registrar novo peso
4. Banco (migrations + RLS):
   profiles, weight_logs, foods, meals, meal_items, exercises, workout_templates, workout_template_items, workouts, workout_sets, water_logs, daily_targets
   - foods: name, brand, barcode (unique, nullable), food_group, base_g (100), kcal, protein, carbs, fat, fiber, sodium_mg, serving_g, serving_label, source (taco|off|usda|manual|ai), source_ref (ex.: taco_id), source_url, verified bool, created_by, created_at
   - foods com source != manual são legíveis por todos; manual visível ao criador até verified=true
   - meal_items guarda snapshot dos macros calculados (não depender de alteração futura em foods)
5. Import TACO: script /scripts/import-taco.ts lendo /data/taco.csv → upsert em foods por (source='taco', source_ref=taco_id).
   - Colunas do CSV: taco_id,name,group,base_g,kcal,protein,carbs,fat,fiber,sodium_mg,source,verified,kcal_divergente
   - Campo vazio = NULL (não medido, NA ou *); traço (Tr) já convertido para 0
   - Ignorar linhas com kcal NULL (ex.: Coco verde)
   - Na TACO, carbs = carboidrato total (inclui fibra)
   - kcal_divergente não vai para o banco (alimentos TACO são verified=true)
6. Exercises (biblioteca):
   - Campos: name, muscle_group, equipment, type (musculacao|cardio|esporte|mobilidade), met_light, met_moderate, met_vigorous, instructions, video_url, image_url, source, source_url, created_by (null = global)
   - Seed com METs do Compendium of Physical Activities (musculação, corrida por ritmo, caminhada, bike, natação, HIIT, esportes comuns) com source_url
   - Seed de exercícios de musculação a partir da API pública do wger (wger.de/api/v2, licença CC-BY-SA: guardar atribuição) com nome em PT quando houver, grupo muscular, equipamento e imagens
   - video_url: aceitar link do YouTube (renderizar embed youtube-nocookie) ou upload para Supabase Storage (bucket exercise-videos, limite 50 MB, mp4/webm)
   - Usuário/personal pode criar exercício próprio e anexar vídeo
7. Criação de treinos (fichas):
   - workout_templates: nome (Treino A/B/C...), objetivo, dias da semana, owner_id, assigned_to (personal pode criar e atribuir a aluno)
   - workout_template_items: exercise_id, ordem, séries, reps (faixa ex. 8-12), carga sugerida, descanso (s), método (normal|bi-set|drop-set|pirâmide), observação
   - Duplicar ficha, reordenar exercícios (drag and drop)
   - Executar treino a partir da ficha: pré-preenche séries/cargas do último treino, timer de descanso, marcar série feita, ver vídeo do exercício na própria tela
   - Histórico por exercício (gráfico de carga/volume, recorde pessoal)
8. Busca de alimentos (cascata): foods local (full text, unaccent, pt) → Open Food Facts por barcode/nome (filtrar countries=brazil) → salvar resultado em foods (source='off', verified=false) como cache
9. Scanner de código de barras: BarcodeDetector API com fallback html5-qrcode
10. Validação de alimento: kcal vs 4P+4(C-fibra)+2*fibra+9G; divergência >15% → flag suspeito na UI (não aplicar a source='taco')
11. Cadastro manual de alimento (form completo por 100 g e porção)
12. Diário: refeições do dia (café, almoço, lanche, jantar, ceia), adicionar item por gramas ou porção; refeições favoritas/repetir dia anterior
13. Água: botões rápidos (200/300/500 ml) + custom
14. Dashboard diário: consumido vs meta (kcal, P, C, G, água), gasto (basal, NEAT, treino, TEF), saldo; visão semanal com gráfico de peso

FASE 2 (NÃO implementar, mas deixar preparado)
- Endpoint /api/foods/ai-lookup (stub) que futuramente chamará a API da Anthropic com web search, retornando JSON padronizado de foods (source='ai', verified=false), passando pela mesma validação
- OCR de tabela nutricional por foto

REGRAS
- Variáveis de ambiente em .env.example (Supabase URL/anon key, service role só no server, OFF user-agent)
- Nenhuma chave no client além da anon key
- Testes unitários para todo /lib/calc
- README com setup (Supabase local, migrations, import TACO, seed exercícios)
- Commits pequenos por etapa

Comece propondo a estrutura de pastas e o schema SQL; depois implemente na ordem dos itens.
