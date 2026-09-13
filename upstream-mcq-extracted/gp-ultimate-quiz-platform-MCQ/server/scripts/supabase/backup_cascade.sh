#!/usr/bin/env bash
# backup_cascade.sh
#
# Dumps all questions (round = 'cascade') and their associated test_cases
# from the Docker PostgreSQL DB into a .sql file as INSERT statements.
#
# Run from anywhere:
#   bash server/scripts/supabase/backup_cascade.sh
#
# Output file: server/scripts/supabase/cascade_backup.sql
#
# To restore after fetch_questions.js, run:
#   sudo docker exec -i main-db psql -U postgres -d contest_db \
#     < /home/saketh/Documents/gp-ultimate-quiz-platform-main/server/scripts/supabase/cascade_backup.sql

OUT="$(cd "$(dirname "$0")" && pwd)/cascade_backup.sql"

echo "Backing up cascade questions and test cases to: $OUT"

# Generate entire SQL inside psql using dollar-quoting via format()
# We pass a heredoc SQL to psql and capture the output directly as the .sql file
sudo docker exec -i main-db psql -U postgres -d contest_db -Atq > "$OUT" <<'PSQL'

-- Header
\echo '-- Cascade questions backup'
\echo '-- Re-run this file AFTER fetch_questions.js to restore cascade rows.'
\echo ''
\echo '-- ============================================================'
\echo '-- QUESTIONS (round = ''cascade'')'
\echo '-- ============================================================'

-- Generate one INSERT per question row, using dollar-quoting for text fields
SELECT
  'INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)' || E'\n' ||
  'VALUES (' || E'\n' ||
  '  ' || quote_literal(title) || ',' || E'\n' ||
  '  ' || quote_literal(coalesce(description, '')) || ',' || E'\n' ||
  '  ' || coalesce(avg_time::text, 'NULL') || ',' || E'\n' ||
  '  ''cascade'',' || E'\n' ||
  '  ' || coalesce(base_points::text, 'NULL') || ',' || E'\n' ||
  '  ' || coalesce(sequence_order::text, 'NULL') || ',' || E'\n' ||
  '  ' || coalesce(time_limit::text, 'NULL') || E'\n' ||
  ');'
FROM questions
WHERE round = 'cascade'
ORDER BY sequence_order NULLS LAST, id;

\echo ''
\echo '-- ============================================================'
\echo '-- TEST CASES for cascade questions (problem_id matched by title)'
\echo '-- ============================================================'

-- Generate one INSERT per test_case, resolving problem_id by question title
SELECT
  'INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)' || E'\n' ||
  'VALUES (' || E'\n' ||
  '  (SELECT id FROM questions WHERE title = ' || quote_literal(q.title) || ' AND round = ''cascade'' LIMIT 1),' || E'\n' ||
  '  ' || quote_literal(coalesce(tc.input, '')) || ',' || E'\n' ||
  '  ' || quote_literal(coalesce(tc.expected_output, '')) || ',' || E'\n' ||
  '  ' || tc.is_hidden::text || E'\n' ||
  ');'
FROM test_cases tc
JOIN questions q ON tc.problem_id::int = q.id
WHERE q.round = 'cascade'
ORDER BY q.sequence_order NULLS LAST, q.id, tc.id;

PSQL

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ Backup failed (psql exit code: $EXIT_CODE)"
  exit 1
fi

LINE_COUNT=$(wc -l < "$OUT")
echo "✅ Done! Backup written to: $OUT ($LINE_COUNT lines)"
echo ""
echo "   To restore after fetch_questions.js, run:"
echo "   sudo docker exec -i main-db psql -U postgres -d contest_db < $OUT"
