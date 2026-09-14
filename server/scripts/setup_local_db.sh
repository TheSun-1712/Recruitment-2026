#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SERVER_DIR/.." && pwd)"
POSTGRES_DIR="$SERVER_DIR/.postgres"
CACHE_DIR="$POSTGRES_DIR/cache"
ROOT_DIR="$POSTGRES_DIR/root"
DATA_DIR="$POSTGRES_DIR/data"

echo "=================================================="
echo "🚀 Grand Prix Offline Exam Platform - DB Setup"
echo "=================================================="

# Check if port 5432 is already occupied
if ss -tulpn 2>/dev/null | grep -q ":5432 "; then
    echo "⚠️ Port 5432 is already in use by a running database or service."
    echo "Verifying if mcq_exam_db is accessible..."
    if command -v psql >/dev/null 2>&1 && psql -h 127.0.0.1 -p 5432 -U postgres -d mcq_exam_db -c "SELECT 1" >/dev/null 2>&1; then
        echo "✅ Connected to existing PostgreSQL on port 5432."
        exit 0
    fi
fi

mkdir -p "$CACHE_DIR" "$ROOT_DIR"

export LD_LIBRARY_PATH="$ROOT_DIR/usr/lib/x86_64-linux-gnu:$ROOT_DIR/usr/lib/postgresql/14/lib:$LD_LIBRARY_PATH"
export PATH="$ROOT_DIR/usr/lib/postgresql/14/bin:$PATH"

if [ ! -f "$ROOT_DIR/usr/lib/postgresql/14/bin/postgres" ]; then
    echo "📦 Downloading PostgreSQL 14 binaries (userspace mode)..."
    cd "$CACHE_DIR"
    apt-get download postgresql-14 postgresql-client-14 postgresql-client-common postgresql-common libpq5
    echo "📂 Extracting binaries into $ROOT_DIR..."
    for deb in *.deb; do
        dpkg -x "$deb" "$ROOT_DIR"
    done
    echo "✅ Extraction complete."
fi

# Initialize database cluster if data directory does not exist
if [ ! -d "$DATA_DIR/base" ]; then
    echo "⚙️ Initializing PostgreSQL data cluster..."
    "$ROOT_DIR/usr/lib/postgresql/14/bin/initdb" -D "$DATA_DIR" -U postgres -A trust --locale=C.UTF-8 >/dev/null

    cat <<EOF >> "$DATA_DIR/postgresql.conf"
port = 5432
listen_addresses = '127.0.0.1'
unix_socket_directories = '/tmp'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
EOF
    echo "✅ PostgreSQL cluster initialized."
fi

# Start PostgreSQL if not already running
if ! "$ROOT_DIR/usr/lib/postgresql/14/bin/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    echo "🔌 Starting PostgreSQL server on 127.0.0.1:5432..."
    "$ROOT_DIR/usr/lib/postgresql/14/bin/pg_ctl" -D "$DATA_DIR" -l "$POSTGRES_DIR/postgres.log" start
    sleep 2
fi

# Check if mcq_exam_db exists
echo "🔍 Checking database mcq_exam_db..."
DB_EXISTS=$("$ROOT_DIR/usr/lib/postgresql/14/bin/psql" -h 127.0.0.1 -p 5432 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='mcq_exam_db'" 2>/dev/null || true)

if [ "$DB_EXISTS" != "1" ]; then
    echo "🔨 Creating database mcq_exam_db..."
    "$ROOT_DIR/usr/lib/postgresql/14/bin/createdb" -h 127.0.0.1 -p 5432 -U postgres mcq_exam_db
fi

# Check if tables exist
TABLE_COUNT=$("$ROOT_DIR/usr/lib/postgresql/14/bin/psql" -h 127.0.0.1 -p 5432 -U postgres -d mcq_exam_db -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 5 ]; then
    echo "📥 Importing database dump ($PROJECT_ROOT/mcq_exam_db_dump.sql)..."
    "$ROOT_DIR/usr/lib/postgresql/14/bin/psql" -h 127.0.0.1 -p 5432 -U postgres -d mcq_exam_db -f "$PROJECT_ROOT/mcq_exam_db_dump.sql" >/dev/null 2>&1
    echo "✅ Database schema and seed data restored successfully!"
else
    echo "ℹ️ Database already contains $TABLE_COUNT tables. Skipping dump restore."
fi

echo "=================================================="
echo "🎉 PostgreSQL is ready!"
echo "Tables in mcq_exam_db:"
"$ROOT_DIR/usr/lib/postgresql/14/bin/psql" -h 127.0.0.1 -p 5432 -U postgres -d mcq_exam_db -c "\dt"
echo "=================================================="
