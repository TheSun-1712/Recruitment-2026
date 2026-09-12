/**
 * seed_weightage.js
 * Sets the exact weightage rules (shift pool + per-student quotas) for EXAM_ID = 1.
 *
 * Shift pool per shift = 75 questions total
 * Per student = 30 questions total
 *
 * Topic-level breakdown:
 * Topic               ShiftE ShiftM ShiftH | StudE StudM StudH
 * Algebra               0     5     0       |  0     2     0
 * Geometry & Vectors    3     4     3       |  1     2     1
 * Calculus              0     3     5       |  0     1     2
 * Trigonometry          0     3     3       |  0     1     1
 * Probability           3     3     3       |  1     1     1
 * P&C                   0     3     0       |  0     1     0
 * General Aptitude      0    10     6       |  0     5     2
 * General (English)     0     7     4       |  0     3     2
 * General (C Prog)      0     7     0       |  0     3     0
 *                      --    --    --       | --    --    --
 * Shift Total:  6+45+24=75  |  Student Total: 2+19+9=30
 */

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5434,
  database: process.env.DB_NAME || 'mcq_exam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});

const EXAM_ID = 1;

// [topic_id, shift_easy, shift_medium, shift_hard, student_easy, student_medium, student_hard]
const WEIGHTAGE_RULES = [
  // Mathematics
  [16, 0, 5, 0,  0, 2, 0],  // Algebra
  [17, 3, 4, 3,  1, 2, 1],  // Geometry and Vectors
  [18, 0, 3, 5,  0, 1, 2],  // Calculus
  [19, 0, 3, 3,  0, 1, 1],  // Trigonometry
  [20, 3, 3, 3,  1, 1, 1],  // Probability
  [21, 0, 3, 0,  0, 1, 0],  // P&C
  // Aptitude
  [24, 0, 10, 6,  0, 5, 2], // General Aptitude
  // English
  [22, 0, 7, 4,  0, 3, 2],  // General (English)
  // C Programming
  [23, 0, 7, 0,  0, 3, 0],  // General (C Programming)
];

async function seed() {
  const client = await pool.connect();

  try {
    console.log('⚖️  Seeding weightage rules...\n');

    // Check shift pool hasn't been generated (rules should only be set before that)
    const lockCheck = await client.query(
      'SELECT id FROM shifts WHERE exam_id = $1 AND paper_generated = true LIMIT 1',
      [EXAM_ID]
    );
    if (lockCheck.rows.length > 0) {
      console.warn('⚠️  Warning: paper already generated for one or more shifts. Clearing shift_questions and resetting paper_generated to allow weightage update...');
      await client.query('DELETE FROM shift_questions WHERE shift_id IN (SELECT id FROM shifts WHERE exam_id = $1)', [EXAM_ID]);
      await client.query('UPDATE shifts SET paper_generated = false WHERE exam_id = $1', [EXAM_ID]);
      console.log('   Shift questions cleared. Weightage rules can now be updated.\n');
    }

    // Delete existing rules for this exam
    await client.query('DELETE FROM weightage_rules WHERE exam_id = $1', [EXAM_ID]);
    console.log('   Cleared existing weightage rules.\n');

    let shiftTotal = 0;
    let studentTotal = 0;

    for (const [topicId, se, sm, sh, ste, stm, sth] of WEIGHTAGE_RULES) {
      // Lookup topic name for logging
      const topicRes = await client.query(
        'SELECT t.name, s.name as subject FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = $1',
        [topicId]
      );
      const topicName = topicRes.rows[0] ? `${topicRes.rows[0].subject} / ${topicRes.rows[0].name}` : `topic_id=${topicId}`;

      await client.query(
        `INSERT INTO weightage_rules
           (exam_id, topic_id, easy_count, medium_count, hard_count, student_easy_count, student_medium_count, student_hard_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (exam_id, topic_id) DO UPDATE SET
           easy_count = EXCLUDED.easy_count,
           medium_count = EXCLUDED.medium_count,
           hard_count = EXCLUDED.hard_count,
           student_easy_count = EXCLUDED.student_easy_count,
           student_medium_count = EXCLUDED.student_medium_count,
           student_hard_count = EXCLUDED.student_hard_count`,
        [EXAM_ID, topicId, se, sm, sh, ste, stm, sth]
      );

      const rowShift = se + sm + sh;
      const rowStudent = ste + stm + sth;
      shiftTotal += rowShift;
      studentTotal += rowStudent;

      console.log(`  ✅ ${topicName.padEnd(35)} | Shift: E${se}+M${sm}+H${sh}=${rowShift}  | Student: E${ste}+M${stm}+H${sth}=${rowStudent}`);
    }

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 TOTALS  →  Shift Pool: ${shiftTotal} / 75  |  Per Student: ${studentTotal} / 30`);

    if (shiftTotal !== 75) {
      console.error(`❌ ERROR: Shift pool total is ${shiftTotal}, expected 75!`);
      process.exit(1);
    }
    if (studentTotal !== 30) {
      console.error(`❌ ERROR: Student total is ${studentTotal}, expected 30!`);
      process.exit(1);
    }

    console.log('\n🎉 Weightage rules seeded successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error('❌ Failed:', err.message); process.exit(1); });
