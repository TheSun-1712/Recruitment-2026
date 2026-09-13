/**
 * upload_questions.js
 *
 * Reads all questions + test_cases from the local PostgreSQL DB
 * and pushes them to Supabase (full replace — truncate then batch insert).
 *
 * Run from the server/ directory:
 *   node scripts/supabase/upload_questions.js
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

async function upload() {
    console.log("🔌 Connecting to local DB...");
    await localPool.query("SELECT 1");
    // Ensure the sample_input column exists on the local DB just in case
    await localPool.query("ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS sample_input TEXT DEFAULT ''");
    console.log("✅ Local DB connected and schema verified.\n");

    // ── 1. Read all local questions ──────────────────────────────────────────
    console.log("📖 Reading questions from local DB...");
    const { rows: questions } = await localPool.query(
        "SELECT * FROM questions ORDER BY id ASC"
    );
    console.log(`   Found ${questions.length} questions.`);

    // ── 2. Read all local test_cases ─────────────────────────────────────────
    console.log("📖 Reading test_cases from local DB...");
    const { rows: testCases } = await localPool.query(
        "SELECT * FROM test_cases ORDER BY id ASC"
    );
    console.log(`   Found ${testCases.length} test cases.\n`);

    if (questions.length === 0) throw new Error("No questions found locally — aborting to protect Supabase.");

    // ── 3. Wipe Supabase atomically via TRUNCATE RPC ──────────────────────────
    // Try the atomic truncate RPC first; fall back to individual deletes.
    console.log("🗑️  Clearing Supabase (truncate)...");
    const { error: truncErr } = await supabase.rpc("truncate_questions_and_testcases");
    if (truncErr) {
        console.warn("⚠️  truncate RPC not found, falling back to DELETE...");
        const { error: delTCErr } = await supabase.from("test_cases").delete().gt("id", 0);
        if (delTCErr) throw new Error("Delete test_cases failed: " + delTCErr.message);
        const { error: delQErr } = await supabase.from("questions").delete().gt("id", 0);
        if (delQErr) throw new Error("Delete questions failed: " + delQErr.message);
    }
    console.log("   ✅ Supabase cleared.\n");

    // ── 4. Batch insert all questions ─────────────────────────────────────────
    console.log("⬆️  Inserting questions into Supabase (batch)...");
    const questionPayload = questions.map(q => ({
        title: q.title,
        description: q.description,
        avg_time: q.avg_time,
        round: q.round,
        base_points: q.base_points,
        sequence_order: q.sequence_order,
        time_limit: q.time_limit,
        sample_input: q.sample_input || '',
    }));

    const { data: insertedQuestions, error: insQErr } = await supabase
        .from("questions")
        .insert(questionPayload)
        .select("id, title");

    if (insQErr) throw new Error("Batch insert questions failed: " + insQErr.message);

    // ── 5. Build localId → supabaseId map using title as stable key ───────────
    // IMPORTANT: Do NOT use array index — Supabase does not guarantee response order.
    const localToSupabaseId = {};
    const titleToSupabaseId = {};
    for (const row of insertedQuestions) {
        titleToSupabaseId[row.title.trim()] = row.id;
    }
    for (const q of questions) {
        const supId = titleToSupabaseId[q.title.trim()];
        if (supId === undefined) {
            throw new Error(`Could not find Supabase id for question "${q.title}" — title mismatch after batch insert.`);
        }
        localToSupabaseId[q.id] = supId;
        console.log(`   ✅ Q${q.id} "${q.title}" (${q.round}) → Supabase id=${supId}`);
    }

    // ── 6. Batch insert all test_cases with remapped problem_id ───────────────
    console.log("\n⬆️  Inserting test_cases into Supabase (batch)...");
    const tcPayload = [];
    let skipped = 0;

    for (const tc of testCases) {
        const localProblemId = parseInt(tc.problem_id, 10);
        const newProblemId = localToSupabaseId[localProblemId];

        if (newProblemId === undefined) {
            console.warn(`   ⚠️  Skipping test_case id=${tc.id}: no matching question for problem_id=${tc.problem_id}`);
            skipped++;
            continue;
        }

        tcPayload.push({
            problem_id: String(newProblemId),
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
        });
    }

    if (tcPayload.length > 0) {
        const { error: insTCErr } = await supabase.from("test_cases").insert(tcPayload);
        if (insTCErr) throw new Error("Batch insert test_cases failed: " + insTCErr.message);
    }

    console.log(`   ✅ Inserted ${tcPayload.length} test cases${skipped > 0 ? `, skipped ${skipped}` : ''}.`);

    // ── 7. Post-upload validation ─────────────────────────────────────────────
    console.log("\n🔍 Validating Supabase counts...");
    const { count: supQCount } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true });
    const { count: supTCCount } = await supabase
        .from("test_cases")
        .select("*", { count: "exact", head: true });

    console.log(`   Supabase: ${supQCount} questions, ${supTCCount} test cases`);
    console.log(`   Expected: ${questions.length} questions, ${tcPayload.length} test cases`);

    if (supQCount !== questions.length) {
        throw new Error(`Upload incomplete: expected ${questions.length} questions, Supabase has ${supQCount}`);
    }
    if (supTCCount !== tcPayload.length) {
        throw new Error(`Upload incomplete: expected ${tcPayload.length} test cases, Supabase has ${supTCCount}`);
    }

    console.log("\n🎉 Upload complete! Supabase is now up-to-date.");

    await localPool.end();
    process.exit(0);
}

upload().catch((err) => {
    console.error("❌ Upload failed:", err.message);
    localPool.end();
    process.exit(1);
});
