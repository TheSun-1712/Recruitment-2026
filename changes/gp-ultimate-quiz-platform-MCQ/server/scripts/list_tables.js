
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function listTables() {
    const pool = new Pool(config);
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables:", res.rows.map(r => r.table_name));
        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

listTables();
