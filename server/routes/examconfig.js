const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// GET /admin/exam - Get active exam config (or latest created)
router.get('/', async (req, res) => {
    try {
        let result = await pool.query(
            `SELECT * FROM exam_config WHERE is_active = true ORDER BY id DESC LIMIT 1`
        );
        if (result.rows.length === 0) {
            result = await pool.query(
                `SELECT * FROM exam_config ORDER BY id DESC LIMIT 1`
            );
        }

        if (result.rows.length === 0) {
            return res.json({ exam: null, message: 'No exam configured yet.' });
        }

        const exam = result.rows[0];

        // Gather quick stats for this exam
        const stats = await pool.query(
            `SELECT 
                COUNT(DISTINCT s.id) AS total_shifts,
                COUNT(DISTINCT c.id) AS total_candidates,
                COUNT(DISTINCT q.id) AS total_questions,
                BOOL_OR(s.paper_generated) AS any_paper_generated
             FROM exam_config e
             LEFT JOIN shifts s ON s.exam_id = e.id
             LEFT JOIN candidates c ON c.shift_id = s.id
             LEFT JOIN questions q ON q.exam_id = e.id AND q.is_deleted = false
             WHERE e.id = $1`,
            [exam.id]
        );

        res.json({
            exam,
            stats: {
                total_shifts: parseInt(stats.rows[0].total_shifts || 0, 10),
                total_candidates: parseInt(stats.rows[0].total_candidates || 0, 10),
                total_questions: parseInt(stats.rows[0].total_questions || 0, 10),
                any_paper_generated: !!stats.rows[0].any_paper_generated,
            },
        });
    } catch (err) {
        console.error('GET /admin/exam error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/exam - Create new exam
router.post('/', async (req, res) => {
    const { name, total_duration_min, grace_join_min, questions_per_shift, questions_per_candidate } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Exam name is required' });
    }

    try {
        // If this is the first exam, make it active by default
        const countRes = await pool.query('SELECT COUNT(*) FROM exam_config');
        const isFirst = parseInt(countRes.rows[0].count, 10) === 0;

        const result = await pool.query(
            `INSERT INTO exam_config 
                (name, total_duration_min, grace_join_min, questions_per_shift, questions_per_candidate, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                name.trim(),
                parseInt(total_duration_min, 10) || 60,
                parseInt(grace_join_min, 10) || 15,
                parseInt(questions_per_shift, 10) || 75,
                parseInt(questions_per_candidate, 10) || 30,
                isFirst,
            ]
        );

        res.status(201).json({ success: true, exam: result.rows[0] });
    } catch (err) {
        console.error('POST /admin/exam error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/exam/:id - Update exam config (blocked if papers generated)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, total_duration_min, grace_join_min, questions_per_shift, questions_per_candidate } = req.body;

    try {
        // Check if any shift for this exam already has papers generated
        const lockedCheck = await pool.query(
            `SELECT id, name FROM shifts WHERE exam_id = $1 AND paper_generated = true LIMIT 1`,
            [id]
        );

        if (lockedCheck.rows.length > 0) {
            return res.status(400).json({
                error: 'Exam configuration is locked because question papers have already been generated for one or more shifts.',
            });
        }

        const existing = await pool.query('SELECT * FROM exam_config WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const current = existing.rows[0];

        const updated = await pool.query(
            `UPDATE exam_config
             SET name = $1,
                 total_duration_min = $2,
                 grace_join_min = $3,
                 questions_per_shift = $4,
                 questions_per_candidate = $5
             WHERE id = $6
             RETURNING *`,
            [
                name !== undefined ? name.trim() : current.name,
                total_duration_min !== undefined ? parseInt(total_duration_min, 10) : current.total_duration_min,
                grace_join_min !== undefined ? parseInt(grace_join_min, 10) : current.grace_join_min,
                questions_per_shift !== undefined ? parseInt(questions_per_shift, 10) : current.questions_per_shift,
                questions_per_candidate !== undefined ? parseInt(questions_per_candidate, 10) : current.questions_per_candidate,
                id,
            ]
        );

        res.json({ success: true, exam: updated.rows[0] });
    } catch (err) {
        console.error('PUT /admin/exam/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/exam/:id/activate - Activate an exam
router.post('/:id/activate', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE exam_config SET is_active = false');
        const result = await client.query(
            'UPDATE exam_config SET is_active = true WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Exam not found' });
        }

        await client.query('COMMIT');
        res.json({ success: true, exam: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /admin/exam/:id/activate error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
