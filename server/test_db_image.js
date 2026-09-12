require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5434,
  user: 'postgres',
  password: 'password',
  database: 'mcq_exam_db'
});
pool.query("SELECT id, body, image_url FROM questions ORDER BY id DESC LIMIT 5;")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
