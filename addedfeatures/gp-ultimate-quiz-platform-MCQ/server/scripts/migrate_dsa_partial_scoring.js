require("dotenv").config({ override: true });
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("📦 Running DSA partial scoring migration...");

        await client.query("BEGIN");

        // 1. Add time_limit to questions (only DSA questions need this set)
        await client.query(`
            ALTER TABLE questions
            ADD COLUMN IF NOT EXISTS time_limit REAL DEFAULT NULL;
        `);
        console.log("✅ Added time_limit column to questions");

        // 2. Add passed_count and score_awarded to dsa_user_questions
        await client.query(`
            ALTER TABLE dsa_user_questions
            ADD COLUMN IF NOT EXISTS passed_count INTEGER DEFAULT 0;
        `);
        await client.query(`
            ALTER TABLE dsa_user_questions
            ADD COLUMN IF NOT EXISTS score_awarded INTEGER DEFAULT 0;
        `);
        console.log("✅ Added passed_count, score_awarded to dsa_user_questions");

        // 3. Set default time_limit for all DSA questions
        await client.query(`
            UPDATE questions SET time_limit = 2.0 WHERE round = 'dsa';
        `);
        console.log("✅ Set time_limit = 2.0s for all DSA questions");

        await client.query("COMMIT");
        console.log("🎉 Migration complete!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
