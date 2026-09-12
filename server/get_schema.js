const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5434, user: 'postgres', password: 'password', database: 'mcq_exam_db' });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questions';")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => console.error(err));
