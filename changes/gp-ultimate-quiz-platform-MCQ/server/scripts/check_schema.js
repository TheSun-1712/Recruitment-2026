
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function checkSchema() {
    const pool = new Pool(config);
    try {
        console.log("--- Checking 'users' table ---");
        const usersRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        if (usersRes.rows.length === 0) {
            console.log("❌ Table 'users' does not exist in contest_db.");
        } else {
            console.table(usersRes.rows);
        }

        console.log("\n--- Checking 'user_questions' table ---");
        const uqRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_questions';
        `);
        console.table(uqRes.rows);

        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

checkSchema();
