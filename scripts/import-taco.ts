// Importa data/taco.csv → foods (upsert por source='taco', source_ref=taco_id).
// Uso: npm run import:taco
import { readFileSync } from "node:fs";
import path from "node:path";
import { csvToObjects } from "../lib/csv";
import { tacoRowToFood, type TacoFood } from "../lib/taco";
import { adminClient, chunk } from "./_admin";

async function main() {
  const file = path.join(import.meta.dirname, "../data/taco.csv");
  const rows = csvToObjects(readFileSync(file, "utf8"));
  const foods = rows.map(tacoRowToFood).filter((f): f is TacoFood => f !== null);
  const skipped = rows.length - foods.length;

  const db = adminClient();
  let done = 0;
  for (const batch of chunk(foods, 200)) {
    const { error } = await db.from("foods").upsert(batch, { onConflict: "source,source_ref" });
    if (error) throw error;
    done += batch.length;
  }
  console.log(`TACO: ${done} alimentos importados, ${skipped} ignorados (kcal NULL).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
