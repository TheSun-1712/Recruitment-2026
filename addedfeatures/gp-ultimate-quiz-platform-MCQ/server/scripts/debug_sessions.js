
const { Pool } = require('pg');
require("dotenv").config({ path: "../.env", override: true });

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

const pool = new Pool(config);

async function checkUserQuestions() {
    try {
        console.log("Checking user_questions...");
        const res = await pool.query(`
            SELECT uq.user_id, uq.question_id, uq.start_time, uq.status, q.title
            FROM user_questions uq
            JOIN questions q ON uq.question_id = q.id
            ORDER BY uq.user_id, uq.question_id;
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUserQuestions();
