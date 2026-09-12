
const { Pool } = require('pg');
require("dotenv").config({ path: "../.env", override: true });

// Hardcode valid config based on previous success
const config = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

const pool = new Pool(config);

async function setup() {
    try {
        console.log("🔌 Connecting to DB...");

        // 1. Create Admins Table
        console.log("Creating 'admins' table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                token VARCHAR(255)
            );
        `);

        // Insert default admin if not exists
        await pool.query(`
            INSERT INTO admins (username, password, token)
            VALUES ('admin', 'admin123', 'ADMIN_TOKEN_SECRET')
            ON CONFLICT (username) DO NOTHING;
        `);

        // 2. Create Round Control Table
        console.log("Creating 'round_control' table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS round_control (
                round_name VARCHAR(50) PRIMARY KEY,
                start_time TIMESTAMP,
                is_active BOOLEAN DEFAULT FALSE
            );
        `);

        // Initialize 'rapidfire' round
        await pool.query(`
            INSERT INTO round_control (round_name, start_time, is_active)
            VALUES ('rapidfire', NULL, FALSE)
            ON CONFLICT (round_name) DO NOTHING;
        `);

        // 3. Add start_time to user_questions
        console.log("Adding 'start_time' to 'user_questions'...");
        // Check if column exists first
        const checkCol = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='user_questions' AND column_name='start_time';
        `);

        if (checkCol.rows.length === 0) {
            await pool.query(`
                ALTER TABLE user_questions 
                ADD COLUMN start_time TIMESTAMP DEFAULT NULL;
            `);
            console.log("✅ Column 'start_time' added.");
        } else {
            console.log("ℹ️ Column 'start_time' already exists.");
        }

        console.log("✅ Admin Schema Setup Complete.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Setup Failed:", err);
        process.exit(1);
    }
}

setup();
