/**
 * G-Prime MCQ Platform — Reset Sessions & Scores Debug Script
 * 
 * Resets:
 *  - results (clears all evaluation scores and submissions)
 *  - candidate_questions (clears all randomized questions, answers, and marks for review)
 *  - candidate_sessions (clears all exam sessions, active timers, socket mappings)
 *  - candidates (resets token_used = false, used_in_shift_id = NULL, session_version = 1)
 * 
 * Preserves:
 *  - exam_config
 *  - shifts
 *  - subjects & topics
 *  - questions
 *  - candidates roster and tokens
 *  - admins table
 * 
 * Usage:
 *   node server/scripts/reset_sessions.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'mcq_exam_db',
});

async function resetSessions() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database:', process.env.DB_NAME || 'mcq_exam_db');
    console.log('🔄 Starting reset of candidate sessions and scores...\n');

    await client.query('BEGIN');

    // 1. Delete results
    const resultsDel = await client.query('DELETE FROM results RETURNING id');
    console.log(`🗑️  Deleted ${resultsDel.rowCount} rows from 'results'`);

    // 2. Delete candidate_questions
    const candQDel = await client.query('DELETE FROM candidate_questions RETURNING id');
    console.log(`🗑️  Deleted ${candQDel.rowCount} rows from 'candidate_questions'`);

    // 3. Delete candidate_sessions
    const candSessDel = await client.query('DELETE FROM candidate_sessions RETURNING id');
    console.log(`🗑️  Deleted ${candSessDel.rowCount} rows from 'candidate_sessions'`);

    // 4. Reset candidate token and session states
    const candReset = await client.query(`
      UPDATE candidates 
      SET token_used = false, 
          used_in_shift_id = NULL, 
          session_version = 1
      RETURNING id
    `);
    console.log(`🔄 Reset ${candReset.rowCount} candidates (token_used=false, session_version=1)`);

    // 5. Reset shifts: clear ended_at, pauses, and extra time so ended shifts can be started again!
    const shouldActivateShifts = process.argv.includes('--activate-shifts') || process.argv.includes('--start');
    if (shouldActivateShifts) {
      await client.query(`
        UPDATE shifts 
        SET is_active = true, 
            is_paused = false, 
            paused_at = NULL,
            ended_at = NULL, 
            started_at = NOW(),
            extra_time_min = 0
      `);
      console.log('⚡ All shifts marked ACTIVE (started_at set to NOW, ended_at cleared).');
    } else {
      await client.query(`
        UPDATE shifts 
        SET ended_at = NULL, 
            is_paused = false, 
            paused_at = NULL,
            extra_time_min = 0,
            started_at = CASE WHEN is_active = true THEN NOW() ELSE NULL END
      `);
      console.log('🔄 All ended shifts cleared of ended state. Ready to be started in Admin Dashboard.');
    }

    // 5. Restart serial sequences for clean IDs on subsequent joins
    const sequences = ['candidate_sessions_id_seq', 'candidate_questions_id_seq', 'results_id_seq'];
    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      } catch (seqErr) {
        // Sequence might differ in naming or not exist
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Successfully committed changes.');

    // 6. Display current shifts status
    const shiftsRes = await client.query(`
      SELECT s.id, s.name, s.is_active, s.is_paused, s.paper_generated,
             (SELECT COUNT(*) FROM candidates WHERE shift_id = s.id) AS candidate_count
      FROM shifts s
      ORDER BY s.id ASC
    `);

    console.log('\n📋 Current Shifts:');
    console.table(shiftsRes.rows);

    // 7. Display ready-to-test sample tokens
    const tokensRes = await client.query(`
      SELECT c.id, c.name, c.roll_no, c.branch, c.section, c.token, s.name AS shift_name, s.is_active AS shift_active
      FROM candidates c
      JOIN shifts s ON s.id = c.shift_id
      ORDER BY c.id ASC
      LIMIT 10
    `);

    console.log('\n🔑 Sample Candidate Tokens Ready to Use:');
    console.table(tokensRes.rows.map(r => ({
      Name: r.name,
      Roll: r.roll_no,
      Class: `${r.branch}-${r.section}`,
      Token: r.token,
      Shift: r.shift_name,
      'Shift Active': r.shift_active ? 'YES' : 'NO (Start in admin)'
    })));

    console.log('🎉 Reset complete! All candidates can now log in afresh with clean sessions.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to reset sessions:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

resetSessions();
