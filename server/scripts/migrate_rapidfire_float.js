const { Pool } = require("pg");
require("dotenv").config({ path: "../.env", override: true });

const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("🔄 Starting Rapidfire float scoring migration...");
        await client.query("BEGIN");

        await client.query(`
            ALTER TABLE users
              ALTER COLUMN rapidfire_score TYPE NUMERIC(10,3)
              USING rapidfire_score::NUMERIC(10,3);
        `);
        console.log("✅ users.rapidfire_score → NUMERIC(10,3)");

        await client.query(`
            ALTER TABLE user_questions
              ALTER COLUMN score_awarded TYPE NUMERIC(10,3)
              USING score_awarded::NUMERIC(10,3);
        `);
        console.log("✅ user_questions.score_awarded → NUMERIC(10,3)");

        await client.query("COMMIT");
        console.log("🎉 Migration complete! Rapidfire scoring is now float-based.");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed (rolled back):", err.message);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
