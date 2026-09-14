/**
 * G-Prime MCQ Platform — Cloud Sync Route
 * Pulls questions from Supabase and inserts any not yet in local PostgreSQL.
 * Deduplication is done locally via cloud_question_id — no global flag touched.
 * POST /admin/sync-questions
 * GET  /admin/sync-status
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const supabase = require('../db/supabase');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// GET /admin/sync-status — count how many cloud questions are not yet in local DB
router.get('/status', async (req, res) => {
  if (!supabase) return res.json({ pending: 0, error: 'Supabase not configured' });
  try {
    // Fetch all cloud question IDs
    const { data: cloudQs, error } = await supabase
      .from('cloud_questions')
      .select('id');
    if (error) throw error;

    if (!cloudQs || cloudQs.length === 0) {
      return res.json({ pending: 0 });
    }

    const cloudIds = cloudQs.map(q => q.id);

    // Count how many of those IDs are already in local DB
    const localRes = await pool.query(
      'SELECT COUNT(*) FROM questions WHERE cloud_question_id = ANY($1::int[])',
      [cloudIds]
    );
    const alreadySynced = parseInt(localRes.rows[0].count, 10);
    const pending = cloudIds.length - alreadySynced;

    res.json({ pending: Math.max(0, pending) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/sync-questions — pull all cloud questions and insert any missing locally
router.post('/', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to server/.env' });

  const client = await pool.connect();
  const results = { synced: 0, skipped: 0, failed: 0, errors: [] };

  try {
    // 1. Get active exam from local DB
    const examRes = await pool.query(
      'SELECT id FROM exam_config WHERE is_active = true ORDER BY id DESC LIMIT 1'
    );
    if (examRes.rows.length === 0) {
      return res.status(400).json({ error: 'No active exam found. Please create and activate an exam first.' });
    }
    const examId = examRes.rows[0].id;

    // 2. Fetch ALL questions from Supabase (no filter on synced_to_local)
    const { data: cloudQs, error: fetchErr } = await supabase
      .from('cloud_questions')
      .select('*, cloud_subjects(name), cloud_topics(name)')
      .order('created_at');

    if (fetchErr) throw fetchErr;
    if (!cloudQs || cloudQs.length === 0) {
      return res.json({ synced: 0, skipped: 0, failed: 0, errors: [], message: 'No questions found in cloud.' });
    }

    // 3. Fetch all cloud_question_ids already in local DB to build a skip-set
    const existingRes = await pool.query(
      'SELECT cloud_question_id FROM questions WHERE cloud_question_id IS NOT NULL'
    );
    const alreadySyncedIds = new Set(existingRes.rows.map(r => r.cloud_question_id));

    await client.query('BEGIN');

    for (const q of cloudQs) {
      try {
        // Skip if already synced to this local DB
        if (alreadySyncedIds.has(q.id)) {
          results.skipped++;
          continue;
        }

        const subjectName = q.cloud_subjects?.name;
        const topicName = q.cloud_topics?.name;

        if (!subjectName || !topicName) {
          results.failed++;
          results.errors.push(`Question #${q.id}: missing subject or topic`);
          continue;
        }

        // 4. Find or create subject in local DB
        let subjectRes = await client.query(
          'SELECT id FROM subjects WHERE exam_id = $1 AND name = $2',
          [examId, subjectName]
        );
        let subjectId;
        if (subjectRes.rows.length === 0) {
          const ins = await client.query(
            'INSERT INTO subjects (exam_id, name) VALUES ($1, $2) RETURNING id',
            [examId, subjectName]
          );
          subjectId = ins.rows[0].id;
        } else {
          subjectId = subjectRes.rows[0].id;
        }

        // 5. Find or create topic in local DB
        let topicRes = await client.query(
          'SELECT id FROM topics WHERE subject_id = $1 AND name = $2',
          [subjectId, topicName]
        );
        let topicId;
        if (topicRes.rows.length === 0) {
          const ins = await client.query(
            'INSERT INTO topics (subject_id, name) VALUES ($1, $2) RETURNING id',
            [subjectId, topicName]
          );
          topicId = ins.rows[0].id;
        } else {
          topicId = topicRes.rows[0].id;
        }

        // 6. Insert question into local DB, storing cloud_question_id for future deduplication
        await client.query(
          `INSERT INTO questions
            (exam_id, topic_id, difficulty, body, option_a, option_b, option_c, option_d,
             correct_opt, explanation, image_url, opt_a_image_url, opt_b_image_url,
             opt_c_image_url, opt_d_image_url, cloud_question_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            examId, topicId,
            q.difficulty, q.body,
            q.option_a, q.option_b, q.option_c, q.option_d,
            q.correct_opt, q.explanation || null, q.image_url || null,
            q.opt_a_image_url || null, q.opt_b_image_url || null,
            q.opt_c_image_url || null, q.opt_d_image_url || null,
            q.id,
          ]
        );

        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Question #${q.id}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    res.json({
      ...results,
      message: `Sync complete. ${results.synced} new, ${results.skipped} already present, ${results.failed} failed.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
