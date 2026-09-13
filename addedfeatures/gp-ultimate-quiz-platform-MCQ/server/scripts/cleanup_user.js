
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function cleanup() {
    const pool = new Pool(config);
    try {
        await pool.query("DELETE FROM user_questions WHERE user_id = 1");
        await pool.query("DELETE FROM user_sessions WHERE user_id = 1");
        console.log("Deleted user 1 session and questions.");
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

cleanup();
