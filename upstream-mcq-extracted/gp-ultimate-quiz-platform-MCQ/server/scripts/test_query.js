
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db', // Make sure this is correct
    password: 'password',
    port: 5432,
};

async function testQuery() {
    const pool = new Pool(config);
    try {
        // user_id = 1 (assuming user with ID 1 exists from previous check)
        const userId = 1;

        console.log("Testing problematic query...");
        const qRes = await pool.query(
            `SELECT q.id, q.title, q.description, q.avg_time 
             FROM questions q
             JOIN user_questions uq ON q.id = uq.question_id
             WHERE uq.user_id = $1
             ORDER BY uq.id ASC`,
            [userId]
        );
        console.log("✅ Query successful!", qRes.rows.length, "rows found.");
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

testQuery();
