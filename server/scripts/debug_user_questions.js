
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function checkUserQuestions() {
    const pool = new Pool(config);
    try {
        const res = await pool.query(`
            SELECT uq.user_id, uq.question_id, uq.status, uq.start_time, uq.sequence_order, q.title 
            FROM user_questions uq
            JOIN questions q ON uq.question_id = q.id
            ORDER BY uq.sequence_order ASC
        `);
        console.log("User Questions:", JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

checkUserQuestions();
