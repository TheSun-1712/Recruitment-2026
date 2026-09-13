
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
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_questions'
        `);
        console.log("Columns:", JSON.stringify(res.rows, null, 2));

        const res2 = await pool.query(`
            SELECT
                tc.constraint_name, 
                kcu.column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu 
                  ON tc.constraint_name = kcu.constraint_name 
                  AND tc.table_schema = kcu.table_schema 
            WHERE tc.table_name = 'user_questions' AND tc.constraint_type = 'PRIMARY KEY';
        `);
        console.log("PK:", JSON.stringify(res2.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

checkSchema();
