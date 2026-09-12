const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5434, user: 'postgres', password: 'password', database: 'mcq_exam_db' });
async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE exam_config ADD COLUMN IF NOT EXISTS questions_per_candidate INTEGER NOT NULL DEFAULT 30;`);
    await client.query(`ALTER TABLE weightage_rules ADD COLUMN IF NOT EXISTS student_easy_count INTEGER NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE weightage_rules ADD COLUMN IF NOT EXISTS student_medium_count INTEGER NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE weightage_rules ADD COLUMN IF NOT EXISTS student_hard_count INTEGER NOT NULL DEFAULT 0;`);
    await client.query('COMMIT');
    console.log('Migration done');
  } catch(e) { await client.query('ROLLBACK'); console.error(e); } finally { client.release(); process.exit(0); }
}
run();
