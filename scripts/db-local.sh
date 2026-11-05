#!/usr/bin/env bash
# Starts a throwaway Postgres for `npm run test:db` when Docker / `supabase start`
# isn't available (CI uses a postgres service instead). Prints the URL to export.
set -euo pipefail
DIR=${ES_PG_DIR:-/var/tmp/espg}
PORT=${ES_PG_PORT:-54329}
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
if [ -z "$BIN" ]; then echo "PostgreSQL is not installed (apt install postgresql)"; exit 1; fi
run_as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$1"; else bash -c "$1"; fi; }
if [ ! -d "$DIR/data" ]; then
  mkdir -p "$DIR"; [ "$(id -u)" = 0 ] && chown postgres "$DIR"; chmod 700 "$DIR"
  run_as_pg "$BIN/initdb -D $DIR/data -U postgres --auth=trust -E UTF8 >/dev/null"
fi
run_as_pg "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR -c listen_addresses=127.0.0.1' -l $DIR/log start >/dev/null" || true
for i in $(seq 1 20); do psql -h 127.0.0.1 -p "$PORT" -U postgres -Atc 'select 1' >/dev/null 2>&1 && break; sleep 0.5; done
psql -h 127.0.0.1 -p "$PORT" -U postgres -Atc "select 1 from pg_database where datname='es_test'" | grep -q 1 || psql -h 127.0.0.1 -p "$PORT" -U postgres -qc 'create database es_test'
echo "export TEST_DATABASE_URL=postgres://postgres@127.0.0.1:$PORT/es_test"
