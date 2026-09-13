const express = require('express');
const subjectRouter = express.Router();
const topicRouter = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

subjectRouter.use(authenticateToken, authorizeAdmin);
topicRouter.use(authenticateToken, authorizeAdmin);

// Helper: get target exam ID
async function getTargetExamId(reqExamId) {
    if (reqExamId) return parseInt(reqExamId, 10);
    const active = await pool.query(
        'SELECT id FROM exam_config WHERE is_active = true ORDER BY id DESC LIMIT 1'
    );
    if (active.rows.length > 0) return active.rows[0].id;
    const latest = await pool.query('SELECT id FROM exam_config ORDER BY id DESC LIMIT 1');
    return latest.rows.length > 0 ? latest.rows[0].id : null;
}

// ============================================================
// SUBJECT ROUTES (Mounted at /admin/subjects)
// ============================================================

// GET /admin/subjects - Nested list: subjects with child topics
subjectRouter.get('/', async (req, res) => {
    try {
        const examId = await getTargetExamId(req.query.exam_id);
        if (!examId) {
            return res.json({ subjects: [], examId: null });
        }

        const subjectsRes = await pool.query(
            `SELECT s.id, s.exam_id, s.name,
                    COUNT(DISTINCT t.id) AS topic_count,
                    COUNT(DISTINCT q.id) AS question_count
             FROM subjects s
             LEFT JOIN topics t ON t.subject_id = s.id
             LEFT JOIN questions q ON q.topic_id = t.id AND q.is_deleted = false
             WHERE s.exam_id = $1
             GROUP BY s.id
             ORDER BY s.id ASC`,
            [examId]
        );

        const topicsRes = await pool.query(
            `SELECT t.id, t.subject_id, t.name,
                    COUNT(q.id) FILTER (WHERE q.is_deleted = false) AS question_count,
                    COUNT(q.id) FILTER (WHERE q.difficulty = 'easy' AND q.is_deleted = false) AS easy_count,
                    COUNT(q.id) FILTER (WHERE q.difficulty = 'medium' AND q.is_deleted = false) AS medium_count,
                    COUNT(q.id) FILTER (WHERE q.difficulty = 'hard' AND q.is_deleted = false) AS hard_count
             FROM topics t
             JOIN subjects s ON s.id = t.subject_id
             LEFT JOIN questions q ON q.topic_id = t.id
             WHERE s.exam_id = $1
             GROUP BY t.id
             ORDER BY t.id ASC`,
            [examId]
        );

        const topicsBySubject = {};
        for (const topic of topicsRes.rows) {
            if (!topicsBySubject[topic.subject_id]) {
                topicsBySubject[topic.subject_id] = [];
            }
            topicsBySubject[topic.subject_id].push({
                id: topic.id,
                name: topic.name,
                question_count: parseInt(topic.question_count || 0, 10),
                easy_count: parseInt(topic.easy_count || 0, 10),
                medium_count: parseInt(topic.medium_count || 0, 10),
                hard_count: parseInt(topic.hard_count || 0, 10),
            });
        }

        const subjects = subjectsRes.rows.map((s) => ({
            id: s.id,
            name: s.name,
            exam_id: s.exam_id,
            topic_count: parseInt(s.topic_count || 0, 10),
            question_count: parseInt(s.question_count || 0, 10),
            topics: topicsBySubject[s.id] || [],
        }));

        res.json({ subjects, examId });
    } catch (err) {
        console.error('GET /admin/subjects error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/subjects - Create subject
subjectRouter.post('/', async (req, res) => {
    const { exam_id, name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Subject name is required' });
    }

    try {
        const targetExamId = await getTargetExamId(exam_id);
        if (!targetExamId) {
            return res.status(400).json({ error: 'No active exam found' });
        }

        const result = await pool.query(
            `INSERT INTO subjects (exam_id, name) VALUES ($1, $2) RETURNING *`,
            [targetExamId, name.trim()]
        );

        res.status(201).json({ success: true, subject: { ...result.rows[0], topics: [] } });
    } catch (err) {
        console.error('POST /admin/subjects error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/subjects/:id - Rename subject
subjectRouter.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Subject name is required' });
    }

    try {
        const result = await pool.query(
            `UPDATE subjects SET name = $1 WHERE id = $2 RETURNING *`,
            [name.trim(), id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        res.json({ success: true, subject: result.rows[0] });
    } catch (err) {
        console.error('PUT /admin/subjects/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /admin/subjects/:id - Delete subject
subjectRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM subjects WHERE id = $1 RETURNING id, name`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        res.json({ success: true, message: `Subject '${result.rows[0].name}' deleted.` });
    } catch (err) {
        console.error('DELETE /admin/subjects/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/subjects/:id/topics - Add topic to subject
subjectRouter.post('/:id/topics', async (req, res) => {
    const { id } = req.params; // subject_id
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Topic name is required' });
    }

    try {
        const subjCheck = await pool.query('SELECT id FROM subjects WHERE id = $1', [id]);
        if (subjCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const result = await pool.query(
            `INSERT INTO topics (subject_id, name) VALUES ($1, $2) RETURNING *`,
            [id, name.trim()]
        );

        res.status(201).json({ success: true, topic: result.rows[0] });
    } catch (err) {
        console.error('POST /admin/subjects/:id/topics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// TOPIC ROUTES (Mounted at /admin/topics)
// ============================================================

// PUT /admin/topics/:id - Rename topic
topicRouter.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Topic name is required' });
    }

    try {
        const result = await pool.query(
            `UPDATE topics SET name = $1 WHERE id = $2 RETURNING *`,
            [name.trim(), id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        res.json({ success: true, topic: result.rows[0] });
    } catch (err) {
        console.error('PUT /admin/topics/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /admin/topics/:id - Delete topic
topicRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM topics WHERE id = $1 RETURNING id, name`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        res.json({ success: true, message: `Topic '${result.rows[0].name}' deleted.` });
    } catch (err) {
        console.error('DELETE /admin/topics/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = { subjectRouter, topicRouter };
