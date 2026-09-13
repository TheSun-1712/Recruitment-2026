const fs = require('fs');
const path = require('path');
const pool = require('../db/index');

async function run() {
  const sqlPath = path.join(__dirname, 'migration_v2.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await pool.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

run();
