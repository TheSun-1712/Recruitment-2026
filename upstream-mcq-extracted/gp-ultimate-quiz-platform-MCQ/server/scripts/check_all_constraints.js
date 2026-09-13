
const { Pool } = require('pg');

const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

async function checkConstraints() {
    const pool = new Pool(config);
    try {
        const res = await pool.query(`
            SELECT
                tc.constraint_name, 
                tc.constraint_type,
                kcu.column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu 
                  ON tc.constraint_name = kcu.constraint_name 
                  AND tc.table_schema = kcu.table_schema 
            WHERE tc.table_name = 'user_questions';
        `);
        console.log("Constraints:", JSON.stringify(res.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        process.exit(1);
    }
}

checkConstraints();
