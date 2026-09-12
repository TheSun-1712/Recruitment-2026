const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5434, user: 'postgres', password: 'password', database: 'mcq_exam_db' });
async function run() {
  try {
    await pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS opt_a_image_url TEXT;");
    await pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS opt_b_image_url TEXT;");
    await pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS opt_c_image_url TEXT;");
    await pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS opt_d_image_url TEXT;");
    console.log("Local schema updated");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
