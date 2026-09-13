
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function count() {
    const pool = new Pool(config);
    try {
        const res = await pool.query('SELECT COUNT(*) FROM questions');
        console.log(`✅ Question Count: ${res.rows[0].count}`);

        const tcParams = await pool.query('SELECT COUNT(*) FROM test_cases');
        console.log(`✅ TestCase Count: ${tcParams.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

count();
