require("dotenv").config({ path: "../.env", override: true });
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

async function setupScoringSchema() {
    try {
        console.log("Setting up Scoring schema...");

        // 1. Add per-round score columns to users table
        console.log("Adding score columns to users table...");
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS rapidfire_score NUMERIC(10,3) DEFAULT 0;
        `);
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS cascade_score INTEGER DEFAULT 0;
        `);
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS dsa_score INTEGER DEFAULT 0;
        `);
        console.log("✅ users table updated with rapidfire_score, cascade_score, dsa_score");

        // 2. Add score_awarded column to user_questions (for rapidfire per-question tracking)
        console.log("Adding score_awarded column to user_questions table...");
        await pool.query(`
            ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS score_awarded NUMERIC(10,3) DEFAULT 0;
        `);
        console.log("✅ user_questions table updated with score_awarded");

        // 3. Add score_awarded column to cascade_user_questions (for cascade per-question tracking)
        console.log("Adding score_awarded column to cascade_user_questions table...");
        await pool.query(`
            ALTER TABLE cascade_user_questions ADD COLUMN IF NOT EXISTS score_awarded INTEGER DEFAULT 0;
        `);
        console.log("✅ cascade_user_questions table updated with score_awarded");

        // 4. Add streak_bonus_applied flag to cascade_sessions (for admin batch bonus)
        console.log("Adding streak_bonus_applied column to cascade_sessions table...");
        await pool.query(`
            ALTER TABLE cascade_sessions ADD COLUMN IF NOT EXISTS streak_bonus_applied BOOLEAN DEFAULT FALSE;
        `);
        console.log("✅ cascade_sessions table updated with streak_bonus_applied");

        console.log("🎉 Scoring schema setup completed successfully!");

    } catch (err) {
        console.error("❌ Scoring schema setup failed:", err.message);
    } finally {
        pool.end();
    }
}

setupScoringSchema();
