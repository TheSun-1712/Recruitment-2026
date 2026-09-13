require("dotenv").config({ override: true });
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// ============================================================
//  Range Pair Sum — Test Data
//
//  Input format:  t\nN1\nN2\n... (t values of N)
//  Output format: answer1\nanswer2\n...
//
//  Formula:  c0 = floor(N/3),  c1 = ceil(N/3),  c2 = round(N/3)
//            pairs = c0*(c0-1)/2 + c1*c2
// ============================================================

// Q1 — 3 TCs all small (brute force passes all)
const Q1_TC1 = { input: "4\n5\n10\n20\n30", expected: "4\n15\n64\n145\n" };
const Q1_TC2 = { input: "4\n40\n60\n80\n90", expected: "260\n590\n1054\n1335\n" };
const Q1_TC3 = { input: "4\n50\n75\n95\n100", expected: "409\n925\n1489\n1650\n" };

// Q2-Q5 — TC1=small, TC2=medium, TC3=large
const TC1_SMALL = {
    input: "4\n5\n10\n50\n100",
    expected: "4\n15\n409\n1650\n"
};
const TC2_MEDIUM = {
    input: "4\n1000\n20000\n99999\n100000",
    expected: "166500\n66663334\n1666616667\n1666650000\n"
};
const TC3_LARGE = {
    input: "4\n10000000\n100000000\n1000000000\n999999937",
    expected: "16666665000000\n1666666650000000\n166666666500000000\n166666645500000672\n"
};

const PROBLEM_DESCRIPTION = `## Range Pair Sum

You are given an integer **N**.

Count the number of pairs **(i, j)** such that:
- 1 ≤ i < j ≤ N
- (i + j) is divisible by 3

Print the total count.

---

### Input Format

The first line contains **t** — the number of test cases.
Each of the next **t** lines contains a single integer **N**.

### Output Format

For each test case, print the answer on a new line.

---

### Example

**Input:**
\`\`\`
1
5
\`\`\`

**Output:**
\`\`\`
4
\`\`\`

**Explanation:**
Valid pairs: (1,2)→3✔, (1,5)→6✔, (2,4)→6✔, (4,5)→9✔ → Total = 4

---

### Constraints

See subtask details in this question's scoring tier.`;

async function seedDSAQuestions() {
    try {
        console.log("🌱 Seeding DSA questions (Range Pair Sum × 5)...");

        // Delete old DSA questions and test cases
        const existingRes = await pool.query("SELECT id FROM questions WHERE round = 'dsa'");
        for (const row of existingRes.rows) {
            await pool.query("DELETE FROM test_cases WHERE problem_id = $1", [row.id.toString()]);
        }
        await pool.query("DELETE FROM questions WHERE round = 'dsa'");
        console.log("🗑️  Cleared old DSA questions and test cases");

        const questions = [
            {
                title: "Range Pair Sum",
                description: PROBLEM_DESCRIPTION + "\n\n> **Subtask 1 (50 pts):** 1 ≤ N ≤ 100. Brute force O(N²) works.",
                base_points: 50,
                time_limit: 2.0,
                sequence_order: 0,
                test_cases: [Q1_TC1, Q1_TC2, Q1_TC3],
            },
            {
                title: "Range Pair Sum",
                description: PROBLEM_DESCRIPTION + "\n\n> **Subtask 2 (100 pts):** 2 hidden TCs. TC1 (N≤100): brute force O(N²) earns 30 pts. TC2 (N≤10⁵): O(N) or better earns 100 pts total.",
                base_points: 100,
                time_limit: 2.0,
                sequence_order: 1,
                test_cases: [TC1_SMALL, TC2_MEDIUM],
            },
            {
                title: "Range Pair Sum",
                description: PROBLEM_DESCRIPTION + "\n\n> **Subtask 3 (100 pts):** 2 hidden TCs. TC1 (N≤100): brute force O(N²) earns 30 pts. TC2 (N≤10⁵): O(N) or better earns 100 pts total.",
                base_points: 100,
                time_limit: 2.0,
                sequence_order: 2,
                test_cases: [TC1_SMALL, TC2_MEDIUM],
            },
            {
                title: "Range Pair Sum",
                description: PROBLEM_DESCRIPTION + "\n\n> **Subtask 4 (150 pts):** 1 ≤ N ≤ 10⁹. Only O(1) mathematical formula will pass.",
                base_points: 150,
                time_limit: 2.0,
                sequence_order: 3,
                test_cases: [TC1_SMALL, TC2_MEDIUM, TC3_LARGE],
            },
            {
                title: "Range Pair Sum",
                description: PROBLEM_DESCRIPTION + "\n\n> **Subtask 5 (150 pts):** 1 ≤ N ≤ 10⁹. Only O(1) mathematical formula will pass.",
                base_points: 150,
                time_limit: 2.0,
                sequence_order: 4,
                test_cases: [TC1_SMALL, TC2_MEDIUM, TC3_LARGE],
            },
        ];

        for (const q of questions) {
            const qRes = await pool.query(
                `INSERT INTO questions (title, description, base_points, round, sequence_order, time_limit)
                 VALUES ($1, $2, $3, 'dsa', $4, $5) RETURNING id`,
                [q.title, q.description, q.base_points, q.sequence_order, q.time_limit]
            );
            const questionId = qRes.rows[0].id;

            for (let i = 0; i < q.test_cases.length; i++) {
                const tc = q.test_cases[i];
                await pool.query(
                    `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
                     VALUES ($1, $2, $3, TRUE)`,
                    [questionId.toString(), tc.input, tc.expected]
                );
            }

            console.log(`✅ Seeded Q${q.sequence_order + 1}: ${q.title} (ID: ${questionId}, ${q.base_points} pts, ${q.test_cases.length} TCs)`);
        }

        console.log("🎉 DSA seeding complete!");
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        pool.end();
    }
}

seedDSAQuestions();
