// Seed da biblioteca global de exercícios:
//  1) METs do Compendium of Physical Activities (lib/exercises/compendium.ts)
//  2) Exercícios de musculação do wger (wger.de/api/v2, CC-BY-SA 4.0 — atribuição guardada)
// Uso: npm run seed:exercises [-- --no-wger]
import { COMPENDIUM, COMPENDIUM_URL } from "../lib/exercises/compendium";
import { WGER_API, wgerToExercise, type WgerExerciseInfo } from "../lib/exercises/wger";
import { adminClient, chunk } from "./_admin";

async function seedCompendium(db: ReturnType<typeof adminClient>) {
  const rows = COMPENDIUM.map((c) => ({
    name: c.name,
    type: c.type,
    muscle_group: c.muscle_group ?? null,
    equipment: c.equipment ?? null,
    met_light: c.light ?? c.met ?? null,
    met_moderate: c.moderate ?? c.met ?? null,
    met_vigorous: c.vigorous ?? c.met ?? null,
    source: "compendium",
    source_ref: c.slug,
    source_url: `${COMPENDIUM_URL}#${c.code}`,
    license: "Compendium of Physical Activities",
    attribution: `Compendium of Physical Activities, código ${c.code}`,
    created_by: null,
  }));
  const { error } = await db.from("exercises").upsert(rows, { onConflict: "source,source_ref" });
  if (error) throw error;
  console.log(`Compendium: ${rows.length} atividades.`);
}

async function fetchWger(): Promise<WgerExerciseInfo[]> {
  const out: WgerExerciseInfo[] = [];
  let url: string | null = `${WGER_API}/exerciseinfo/?limit=200`;
  while (url) {
    const res: Response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`wger ${res.status} em ${url}`);
    const page = (await res.json()) as { next: string | null; results: WgerExerciseInfo[] };
    out.push(...page.results);
    url = page.next;
    process.stdout.write(`\rwger: ${out.length} baixados`);
  }
  process.stdout.write("\n");
  return out;
}

async function seedWger(db: ReturnType<typeof adminClient>) {
  const all = await fetchWger();
  const rows = all.map(wgerToExercise).filter((r) => r !== null);
  for (const batch of chunk(rows, 200)) {
    const { error } = await db.from("exercises").upsert(batch, { onConflict: "source,source_ref" });
    if (error) throw error;
  }
  console.log(`wger: ${rows.length} exercícios de musculação (${all.length - rows.length} ignorados).`);
}

async function main() {
  const db = adminClient();
  await seedCompendium(db);
  if (!process.argv.includes("--no-wger")) await seedWger(db);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
