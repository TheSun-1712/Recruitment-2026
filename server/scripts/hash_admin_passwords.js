/**
 * One-time script: hash existing admin plain-text passwords and store in password_hash column.
 * Run once with: node scripts/hash_admin_passwords.js
 */

require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

async function main() {
    const admins = await pool.query('SELECT id, username, password FROM admins');
    console.log(`Found ${admins.rows.length} admin(s) to migrate...`);

    for (const admin of admins.rows) {
        if (!admin.password) {
            console.log(`  ⏭  Skipping ${admin.username} — no plain password set`);
            continue;
        }
        const hash = await bcrypt.hash(admin.password, 12);
        await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [hash, admin.id]);
        console.log(`  ✅ Hashed password for admin: ${admin.username}`);
    }

    console.log('Migration complete.');
    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
