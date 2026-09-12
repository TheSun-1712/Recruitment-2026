require("dotenv").config({ override: true });
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function setupCascadeSchema() {
  try {
    console.log("Setting up Coding Cascade schema...");

    // 1. Cascade Sessions Table
    console.log("Creating cascade_sessions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cascade_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          join_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          current_streak INTEGER DEFAULT 0,
          max_streak INTEGER DEFAULT 0,
          highest_forward_index INTEGER DEFAULT 0
      );
    `);
    console.log("✅ cascade_sessions created");

    // 2. Cascade User Questions Table
    console.log("Creating cascade_user_questions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cascade_user_questions (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          sequence_order INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT NULL,
          base_points INTEGER DEFAULT 0,
          is_streak_eligible BOOLEAN DEFAULT TRUE,
          PRIMARY KEY (user_id, question_id)
      );
    `);
    console.log("✅ cascade_user_questions created");

    // 3. Modifying Questions table for Cascade fields
    console.log("Adding cascade-specific columns to questions table if they don't exist...");
    // Add round identifier
    await pool.query(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS round VARCHAR(50) DEFAULT 'rapidfire';
    `);
    // Add base_points
    await pool.query(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS base_points INTEGER DEFAULT 10;
    `);

    // Add sequence column if not exists (to enforce the fixed order)
    await pool.query(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;
    `);
    console.log("✅ questions table updated with round, base_points, and sequence_order columns");

    // 4. Add review-mode persistence columns to cascade_sessions
    console.log("Adding review-mode columns to cascade_sessions...");
    await pool.query(`
      ALTER TABLE cascade_sessions
      ADD COLUMN IF NOT EXISTS is_review_mode BOOLEAN DEFAULT FALSE;
    `);
    await pool.query(`
      ALTER TABLE cascade_sessions
      ADD COLUMN IF NOT EXISTS current_viewing_index INTEGER DEFAULT 0;
    `);
    console.log("✅ cascade_sessions updated with is_review_mode and current_viewing_index");

    console.log("🎉 Cascade Schema setup completed successfully!");

  } catch (err) {
    console.error("❌ Schema setup failed:", err.message);
  } finally {
    pool.end();
  }
}

setupCascadeSchema();
