require("dotenv").config({ override: true });
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

async function setupDSASchema() {
    try {
        console.log("Setting up DSA round schema...");

        // 1. DSA Sessions Table
        console.log("Creating dsa_sessions table...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS dsa_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          join_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          total_score INTEGER DEFAULT 0
      );
    `);
        console.log("✅ dsa_sessions created");

        // 2. DSA User Questions Table
        console.log("Creating dsa_user_questions table...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS dsa_user_questions (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          sequence_order INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT NULL,
          base_points INTEGER DEFAULT 0,
          accepted_at TIMESTAMP DEFAULT NULL,
          PRIMARY KEY (user_id, question_id)
      );
    `);
        console.log("✅ dsa_user_questions created");

        console.log("🎉 DSA Schema setup completed successfully!");

    } catch (err) {
        console.error("❌ Schema setup failed:", err.message);
    } finally {
        pool.end();
    }
}

setupDSASchema();
