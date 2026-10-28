#!/usr/bin/env bash
# Aplica stub + migrations + testes de RLS num Postgres local puro.
# Uso: DB=treinos_test bash supabase/tests/run.sh   (precisa de createdb/psql no PATH)
set -euo pipefail
DB=${DB:-treinos_test}
DIR=$(cd "$(dirname "$0")/.." && pwd)
dropdb --if-exists "$DB"
createdb "$DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$DIR/tests/stub-supabase.sql"
for f in "$DIR"/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"
done
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f "$DIR/tests/rls.sql"
echo "OK"
