
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

async function addSequenceColumn() {
    try {
        console.log("🔌 Connecting to DB...");

        console.log("Adding 'sequence_order' column to 'user_questions'...");
        await pool.query(`
            ALTER TABLE user_questions 
            ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
        `);

        console.log("✅ Column 'sequence_order' added.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Failed:", err);
        process.exit(1);
    }
}

addSequenceColumn();
