const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/join", async (req, res) => {
  try {
    const { token } = req.body;
    const { contestStartTime, CONTEST_DURATION_MIN, JOIN_WINDOW_MIN } = req.contest;

    // 1. Check if contest started
    if (!contestStartTime) {
      return res.status(400).json({ error: "Contest not started yet" });
    }

    const now = new Date();
    const joinDeadline = new Date(
      contestStartTime.getTime() + JOIN_WINDOW_MIN * 60 * 1000
    );

    // 2. Check time window
    if (now > joinDeadline) {
      return res.status(403).json({ error: "Join window closed" });
    }

    // 3. Validate user (Database Check)
    const userRes = await pool.query(
      "SELECT * FROM users WHERE token = $1",
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = userRes.rows[0];

    // 4. Create session
    const endTime = new Date(
      now.getTime() + CONTEST_DURATION_MIN * 60 * 1000
    );

    await pool.query(
      "INSERT INTO user_sessions(user_id, join_time, end_time) VALUES ($1, $2, $3)",
      [user.id, now, endTime]
    );

    // 5. Assign questions
    const qRes = await pool.query(
      "SELECT id, title, description, avg_time FROM questions ORDER BY RANDOM() LIMIT 10"
    );

    if (qRes.rows.length === 0) {
      return res.status(500).json({ error: "No questions found in DB" });
    }

    for (const q of qRes.rows) {
      await pool.query(
        "INSERT INTO user_questions(user_id, question_id) VALUES ($1, $2)",
        [user.id, q.id]
      );
    }

    res.json({
      userId: user.id,
      team: user.team_name,
      college: user.college,
      endTime,
      questions: qRes.rows,
    });

  } catch (err) {
    console.error("❌ JOIN ERROR:", err.message); // Look at this in your terminal!
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// router.post("/join", async (req, res) => {
//   const { token } = req.body;
//   const { contestStartTime, CONTEST_DURATION_MIN, JOIN_WINDOW_MIN } = req.contest;

//   if (!contestStartTime) {
//     return res.status(400).json({ error: "Contest not started yet" });
//   }

//   const now = new Date();
//   const joinDeadline = new Date(
//     contestStartTime.getTime() + JOIN_WINDOW_MIN * 60 * 1000
//   );

//   if (now > joinDeadline) {
//     return res.status(403).json({ error: "Join window closed" });
//   }

//   // Validate user
//   const userRes = await pool.query(
//     "SELECT * FROM users WHERE token = $1",
//     [token]
//   );

//   if (userRes.rows.length === 0) {
//     return res.status(401).json({ error: "Invalid token" });
//   }

//   const user = userRes.rows[0];

//   // Create session
//   const endTime = new Date(
//     now.getTime() + CONTEST_DURATION_MIN * 60 * 1000
//   );

//   // //check if the user has an active session with that token already.
//   // const active = await pool.query(
//   // `SELECT * FROM user_sessions
//   //  WHERE user_id = $1 AND end_time > NOW()`,
//   // [user.id]
//   // );

//   // if (active.rows.length > 0) {
//   // return res.status(403).json({
//   //   error: "This token is already in use on another device.",
//   //   });
//   // }

//   await pool.query(
//     "INSERT INTO user_sessions(user_id, join_time, end_time) VALUES ($1, $2, $3)",
//     [user.id, now, endTime]
//   );

//   // Assign random 10 questions
//   const qRes = await pool.query(
//     "SELECT id, title, description, avg_time FROM questions ORDER BY RANDOM() LIMIT 10"
//   );

//   for (const q of qRes.rows) {
//     await pool.query(
//       "INSERT INTO user_questions(user_id, question_id) VALUES ($1, $2)",
//       [user.id, q.id]
//     );
//   }

//   res.json({
//     userId: user.id,
//     team: user.team_name,
//     college: user.college,
//     endTime,
//     questions: qRes.rows,
//   });
// });

// module.exports = router;
