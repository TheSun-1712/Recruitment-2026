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
        console.log("🔄 Starting TIMESTAMPTZ migration...");
        await client.query("BEGIN");

        // cascade_sessions
        console.log("  Migrating cascade_sessions...");
        await client.query("ALTER TABLE cascade_sessions ALTER COLUMN join_time TYPE TIMESTAMPTZ");
        await client.query("ALTER TABLE cascade_sessions ALTER COLUMN end_time TYPE TIMESTAMPTZ");
        await client.query(`
            UPDATE cascade_sessions
            SET join_time = join_time - INTERVAL '5 hours 30 minutes',
                end_time  = end_time  - INTERVAL '5 hours 30 minutes'
        `);
        console.log("  ✅ cascade_sessions done");

        // dsa_sessions
        console.log("  Migrating dsa_sessions...");
        await client.query("ALTER TABLE dsa_sessions ALTER COLUMN join_time TYPE TIMESTAMPTZ");
        await client.query("ALTER TABLE dsa_sessions ALTER COLUMN end_time TYPE TIMESTAMPTZ");
        await client.query(`
            UPDATE dsa_sessions
            SET join_time = join_time - INTERVAL '5 hours 30 minutes',
                end_time  = end_time  - INTERVAL '5 hours 30 minutes'
        `);
        console.log("  ✅ dsa_sessions done");

        // user_sessions (rapidfire)
        console.log("  Migrating user_sessions...");
        await client.query("ALTER TABLE user_sessions ALTER COLUMN join_time TYPE TIMESTAMPTZ");
        await client.query("ALTER TABLE user_sessions ALTER COLUMN end_time TYPE TIMESTAMPTZ");
        await client.query(`
            UPDATE user_sessions
            SET join_time = join_time - INTERVAL '5 hours 30 minutes',
                end_time  = end_time  - INTERVAL '5 hours 30 minutes'
        `);
        console.log("  ✅ user_sessions done");

        await client.query("COMMIT");
        console.log("🎉 Migration complete!");

        // Verify
        const res = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('cascade_sessions','dsa_sessions','user_sessions')
              AND column_name IN ('join_time','end_time')
            ORDER BY table_name, column_name
        `);
        console.log("\n📋 Verified column types:");
        res.rows.forEach(r => console.log(`  ${r.table_name}.${r.column_name}: ${r.data_type}`));

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed, rolled back:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
