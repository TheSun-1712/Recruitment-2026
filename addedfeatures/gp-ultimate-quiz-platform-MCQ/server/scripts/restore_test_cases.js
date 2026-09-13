/**
 * restore_test_cases.js
 *
 * Reads the COPY block from sudhamsh.sql and re-imports all 72 test cases
 * into the local PostgreSQL DB via the pg pool (no sudo needed).
 *
 * Run from the server/ directory:
 *   node scripts/restore_test_cases.js
 */

require("dotenv").config({ path: require('path').resolve(__dirname, '../.env'), override: true });
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

async function restore() {
    console.log("🔌 Connecting to local DB...");
    await localPool.query("SELECT 1");
    console.log("✅ Connected.\n");

    // Read sudhamsh.sql
    const sqlPath = path.resolve(__dirname, "../../sudhamsh.sql");
    const content = fs.readFileSync(sqlPath, "utf8");

    // Extract COPY block for test_cases
    const lines = content.split("\n");
    let inCopy = false;
    const rows = [];

    for (const line of lines) {
        if (line.startsWith("COPY public.test_cases")) {
            inCopy = true;
            continue;
        }
        if (inCopy && line === "\\.") {
            break;
        }
        if (inCopy && line.trim()) {
            const parts = line.split("\t");
            // Columns: id, problem_id, input, expected_output, is_hidden
            if (parts.length === 5) {
                rows.push({
                    id: parseInt(parts[0], 10),
                    problem_id: parts[1],
                    input: parts[2].replace(/\\n/g, "\n"),
                    expected_output: parts[3].replace(/\\n/g, "\n"),
                    is_hidden: parts[4].trim() === "t",
                });
            }
        }
    }

    console.log(`📖 Parsed ${rows.length} test cases from sudhamsh.sql`);
    if (rows.length === 0) throw new Error("No rows parsed — check the COPY block location.");

    // Check current local state
    const { rows: currentQ } = await localPool.query("SELECT id FROM questions ORDER BY id");
    const validQuestionIds = new Set(currentQ.map(r => String(r.id)));
    console.log(`   Local questions present: ${currentQ.map(r => r.id).join(", ")}\n`);

    // Validate all problem_ids exist in local questions
    const missing = rows.filter(r => !validQuestionIds.has(r.problem_id));
    if (missing.length > 0) {
        const missingPids = [...new Set(missing.map(r => r.problem_id))];
        throw new Error(`Aborting: ${missing.length} test cases reference problem_ids not in local questions: ${missingPids.join(", ")}`);
    }
    console.log("✅ All problem_ids validated against local questions.\n");

    // Truncate and re-import
    console.log("🗑️  Truncating test_cases...");
    await localPool.query("TRUNCATE test_cases RESTART IDENTITY");

    console.log("⬆️  Inserting test cases...");
    let count = 0;
    for (const row of rows) {
        await localPool.query(
            `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden) VALUES ($1, $2, $3, $4)`,
            [row.problem_id, row.input, row.expected_output, row.is_hidden]
        );
        count++;
    }

    const { rows: finalCount } = await localPool.query("SELECT COUNT(*) as cnt FROM test_cases");
    console.log(`\n✅ Inserted ${count} test cases. DB now has ${finalCount[0].cnt} total.`);
    console.log("🎉 Restore complete!");

    await localPool.end();
    process.exit(0);
}

restore().catch((err) => {
    console.error("❌ Restore failed:", err.message);
    localPool.end();
    process.exit(1);
});
