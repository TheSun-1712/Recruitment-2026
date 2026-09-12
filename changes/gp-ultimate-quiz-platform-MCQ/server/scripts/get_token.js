
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function getToken() {
    const pool = new Pool(config);
    try {
        const res = await pool.query(`SELECT token FROM users WHERE id = 1`);
        console.log("Token:", res.rows[0].token);
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

getToken();
