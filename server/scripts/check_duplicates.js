
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function checkDuplicates() {
    const pool = new Pool(config);
    try {
        const res = await pool.query(`
            SELECT sequence_order, COUNT(*) 
            FROM user_questions 
            WHERE user_id = 1 
            GROUP BY sequence_order 
            ORDER BY sequence_order ASC
        `);
        console.log("Duplicates:", JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

checkDuplicates();
