const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), override: true });

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "5434", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "postgres",
  database: process.env.DB_NAME || "mcq_exam_db",
  max: 30,
});

console.log("🔌 DB Config:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  db: process.env.DB_NAME
});

pool.query("SELECT 1")
  .then(() => console.log("✅ DB connected"))
  .catch(err => console.error("❌ DB connection failed:", err.message));

module.exports = pool;

// const { Pool } = require("pg");

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
// });

// module.exports = pool;