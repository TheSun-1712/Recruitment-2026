
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function checkUser() {
    const pool = new Pool(config);
    try {
        const res = await pool.query(`SELECT id, team_name FROM users WHERE token = 'DEMO123'`);
        console.log("User:", res.rows[0]);

        const res2 = await pool.query(`SELECT COUNT(*) FROM user_questions WHERE user_id = ${res.rows[0].id}`);
        console.log("Total User Questions:", res2.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

checkUser();
