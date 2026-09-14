#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
POSTGRES_DIR="$SERVER_DIR/.postgres"
ROOT_DIR="$POSTGRES_DIR/root"
DATA_DIR="$POSTGRES_DIR/data"

export LD_LIBRARY_PATH="$ROOT_DIR/usr/lib/x86_64-linux-gnu:$ROOT_DIR/usr/lib/postgresql/14/lib:$LD_LIBRARY_PATH"
export PATH="$ROOT_DIR/usr/lib/postgresql/14/bin:$PATH"

if [ -d "$DATA_DIR" ] && "$ROOT_DIR/usr/lib/postgresql/14/bin/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    echo "🛑 Stopping PostgreSQL..."
    "$ROOT_DIR/usr/lib/postgresql/14/bin/pg_ctl" -D "$DATA_DIR" stop -m fast
    echo "✅ PostgreSQL stopped."
else
    echo "ℹ️ PostgreSQL is not running."
fi
