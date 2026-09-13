/**
 * backup_cascade.js
 *
 * Reads all questions (round = 'cascade') and their test_cases from the
 * LOCAL PostgreSQL DB and writes them as SQL INSERT statements to
 * cascade_backup.sql — safe to run again after fetch_questions.js.
 *
 * Run from the server/ directory:
 *   node scripts/supabase/backup_cascade.js
 *
 * To restore after fetch_questions.js:
 *   sudo docker exec -i main-db psql -U postgres -d contest_db \
 *     < scripts/supabase/cascade_backup.sql
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env"), override: true });
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const localPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

const OUT = path.join(__dirname, "cascade_backup.sql");

// Escape a value for SQL: wrap in single quotes, doubling any internal single quotes.
function sqlStr(val) {
    if (val === null || val === undefined) return "NULL";
    return "'" + String(val).replace(/'/g, "''") + "'";
}

// Emit NULL for null numbers, or the raw number for non-null.
function sqlNum(val) {
    if (val === null || val === undefined) return "NULL";
    return String(val);
}

async function backup() {
    console.log("🔌 Connecting to local DB...");
    await localPool.query("SELECT 1");
    console.log("✅ Connected.\n");

    // ── 1. Fetch cascade questions ─────────────────────────────────────────
    const { rows: questions } = await localPool.query(
        `SELECT id, title, description, avg_time, round, base_points, sequence_order, time_limit
         FROM questions
         WHERE round = 'cascade'
         ORDER BY sequence_order NULLS LAST, id`
    );
    console.log(`   Found ${questions.length} cascade questions.`);

    // ── 2. Fetch test_cases for those questions ────────────────────────────
    const qIds = questions.map((q) => q.id);
    let testCases = [];
    if (qIds.length > 0) {
        const { rows } = await localPool.query(
            `SELECT tc.id, tc.problem_id, tc.input, tc.expected_output, tc.is_hidden,
                    q.title AS q_title
             FROM test_cases tc
             JOIN questions q ON tc.problem_id::int = q.id
             WHERE q.id = ANY($1::int[])
             ORDER BY q.sequence_order NULLS LAST, q.id, tc.id`,
            [qIds]
        );
        testCases = rows;
    }
    console.log(`   Found ${testCases.length} test cases.\n`);

    // ── 3. Build SQL file ──────────────────────────────────────────────────
    const lines = [];
    lines.push(`-- Cascade questions backup generated on ${new Date().toISOString()}`);
    lines.push(`-- Re-run this file AFTER fetch_questions.js to restore cascade rows.`);
    lines.push(``);

    lines.push(`-- ============================================================`);
    lines.push(`-- QUESTIONS (round = 'cascade')`);
    lines.push(`-- ============================================================`);

    for (const q of questions) {
        lines.push(
            `INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)` +
            `\nVALUES (` +
            `\n  ${sqlStr(q.title)},` +
            `\n  ${sqlStr(q.description)},` +
            `\n  ${sqlNum(q.avg_time)},` +
            `\n  'cascade',` +
            `\n  ${sqlNum(q.base_points)},` +
            `\n  ${sqlNum(q.sequence_order)},` +
            `\n  ${sqlNum(q.time_limit)}` +
            `\n);`
        );
    }

    lines.push(``);
    lines.push(`-- ============================================================`);
    lines.push(`-- TEST CASES for cascade questions (problem_id resolved by title)`);
    lines.push(`-- ============================================================`);

    for (const tc of testCases) {
        lines.push(
            `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)` +
            `\nVALUES (` +
            `\n  (SELECT id FROM questions WHERE title = ${sqlStr(tc.q_title)} AND round = 'cascade' LIMIT 1),` +
            `\n  ${sqlStr(tc.input)},` +
            `\n  ${sqlStr(tc.expected_output)},` +
            `\n  ${tc.is_hidden}` +
            `\n);`
        );
    }

    fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");

    const lineCount = lines.length;
    console.log(`✅ Written ${questions.length} questions + ${testCases.length} test cases to:`);
    console.log(`   ${OUT}`);
    console.log(`\n   To restore after fetch_questions.js, run:`);
    console.log(`   sudo docker exec -i main-db psql -U postgres -d contest_db < ${OUT}`);

    await localPool.end();
    process.exit(0);
}

backup().catch((err) => {
    console.error("❌ Backup failed:", err.message);
    localPool.end();
    process.exit(1);
});
