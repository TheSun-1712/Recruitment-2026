const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5434,
  user: 'postgres',
  password: 'password',
  database: 'mcq_exam_db',
});
async function test() {
  const res = await pool.query('SELECT * FROM subjects;');
  console.log(res.rows);
  const res2 = await pool.query('SELECT * FROM topics;');
  console.log(res2.rows);
  process.exit(0);
}
test();
