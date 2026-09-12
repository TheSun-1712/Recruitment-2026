/**
 * fetch_questions.js
 *
 * Pulls all questions + test_cases from Supabase and replaces
 * the local PostgreSQL DB (full replace — truncate then insert).
 *
 * Run from the server/ directory:
 *   node scripts/supabase/fetch_questions.js
 */

require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env'), override: true });
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

// ── Local DB connection ─────────────────────────────────────────────────────
const localPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// ── Supabase connection ──────────────────────────────────────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Minimum rows expected from Supabase before we trust it enough to wipe local.
// Adjust if you add/remove questions significantly.
const MIN_EXPECTED_QUESTIONS = 5;
const MIN_EXPECTED_TEST_CASES = 10;

async function fetch() {
    console.log("🔌 Connecting to local DB...");
    await localPool.query("SELECT 1");
    // Ensure the sample_input column exists on the local DB (e.g. for new PC setups)
    await localPool.query("ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS sample_input TEXT DEFAULT ''");
    console.log("✅ Local DB connected and schema verified.\n");

    // ── 1. Fetch all questions from Supabase (.range ensures no pagination cap) ─
    console.log("☁️  Fetching questions from Supabase...");
    const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: true })
        .range(0, 9999);
    if (qErr) throw new Error("Fetch questions failed: " + qErr.message);
    console.log(`   Found ${questions.length} questions.`);

    // ── 2. Fetch all test_cases from Supabase ─────────────────────────────────
    console.log("☁️  Fetching test_cases from Supabase...");
    const { data: testCases, error: tcErr } = await supabase
        .from("test_cases")
        .select("*")
        .order("id", { ascending: true })
        .range(0, 9999);
    if (tcErr) throw new Error("Fetch test_cases failed: " + tcErr.message);
    console.log(`   Found ${testCases.length} test cases.\n`);

    // ── 3. Safety guard — do NOT wipe local if Supabase looks incomplete ───────
    if (questions.length < MIN_EXPECTED_QUESTIONS) {
        throw new Error(
            `🛑 Aborting: Supabase has only ${questions.length} questions (expected ≥${MIN_EXPECTED_QUESTIONS}). ` +
            `Run upload_questions.js first to populate Supabase.`
        );
    }
    if (testCases.length < MIN_EXPECTED_TEST_CASES) {
        throw new Error(
            `🛑 Aborting: Supabase has only ${testCases.length} test cases (expected ≥${MIN_EXPECTED_TEST_CASES}). ` +
            `Run upload_questions.js first to populate Supabase.`
        );
    }
    console.log(`✅ Supabase row counts look valid (${questions.length} Q, ${testCases.length} TC). Proceeding.\n`);

    // ── 4. Clean up local tables that have FK to questions ───────────────────
    // Order matters: children before parent
    console.log("🗑️  Cleaning up local dependent tables...");
    await localPool.query("DELETE FROM dsa_user_questions");
    await localPool.query("DELETE FROM cascade_user_questions");
    await localPool.query("DELETE FROM user_questions");
    await localPool.query("DELETE FROM attempts");
    console.log("   ✅ Dependent tables cleared.");

    // ── 5. Wipe local questions and test_cases ────────────────────────────────
    console.log("🗑️  Clearing local test_cases...");
    await localPool.query("TRUNCATE test_cases RESTART IDENTITY");

    console.log("🗑️  Clearing local questions...");
    // Use TRUNCATE for questions but need to reset sequence manually after re-insert
    await localPool.query("DELETE FROM questions");

    // ── 6. Reset local sequences ──────────────────────────────────────────────
    console.log("🔄 Resetting local sequences...");
    await localPool.query("ALTER SEQUENCE questions_id_seq RESTART WITH 1");
    await localPool.query("ALTER SEQUENCE test_cases_id_seq RESTART WITH 1");
    console.log("   ✅ Sequences reset.\n");

    // ── 7. Insert questions from Supabase (without id — let local DB assign) ──
    console.log("⬇️  Inserting questions into local DB...");
    const supabaseToLocalId = {}; // maps supabase question id → local question id

    for (const q of questions) {
        const supabaseId = q.id;
        const result = await localPool.query(
            `INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit, sample_input)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [q.title, q.description, q.avg_time, q.round, q.base_points, q.sequence_order, q.time_limit, q.sample_input || '']
        );
        const localId = result.rows[0].id;
        supabaseToLocalId[supabaseId] = localId;
        console.log(
            `   ✅ Supabase id=${supabaseId} "${q.title}" (${q.round}) → local id=${localId}`
        );
    }

    // ── 8. Insert test_cases with remapped problem_id ─────────────────────────
    console.log("\n⬇️  Inserting test_cases into local DB...");
    let tcCount = 0;
    let tcSkipped = 0;
    for (const tc of testCases) {
        const supProblemId = parseInt(tc.problem_id, 10);
        const localProblemId = supabaseToLocalId[supProblemId];

        if (localProblemId === undefined) {
            console.warn(
                `   ⚠️  Skipping test_case id=${tc.id}: no matching local question for problem_id=${tc.problem_id}`
            );
            tcSkipped++;
            continue;
        }

        await localPool.query(
            `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
       VALUES ($1, $2, $3, $4)`,
            [String(localProblemId), tc.input, tc.expected_output, tc.is_hidden]
        );
        tcCount++;
    }

    console.log(`   ✅ Inserted ${tcCount} test cases${tcSkipped > 0 ? `, skipped ${tcSkipped}` : ''}.`);
    console.log("\n🎉 Fetch complete! Local DB now matches Supabase.");

    await localPool.end();
    process.exit(0);
}

fetch().catch((err) => {
    console.error("❌ Fetch failed:", err.message);
    localPool.end();
    process.exit(1);
});
