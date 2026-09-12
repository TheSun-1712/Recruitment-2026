const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'questions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        const uniqueName = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed'));
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter,
});

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

// GET /admin/questions/count-by-topic - Live question counts per topic per difficulty
// Placed BEFORE /:id to prevent route shadowing
router.get('/count-by-topic', async (req, res) => {
    try {
        const examId = await getTargetExamId(req.query.exam_id);
        if (!examId) return res.json({ counts: [], examId: null });

        const result = await pool.query(
            `SELECT 
                t.id AS topic_id,
                t.name AS topic_name,
                s.id AS subject_id,
                s.name AS subject_name,
                COUNT(q.id) FILTER (WHERE q.is_deleted = false) AS total_count,
                COUNT(q.id) FILTER (WHERE q.difficulty = 'easy' AND q.is_deleted = false) AS easy_count,
                COUNT(q.id) FILTER (WHERE q.difficulty = 'medium' AND q.is_deleted = false) AS medium_count,
                COUNT(q.id) FILTER (WHERE q.difficulty = 'hard' AND q.is_deleted = false) AS hard_count
             FROM topics t
             JOIN subjects s ON s.id = t.subject_id
             LEFT JOIN questions q ON q.topic_id = t.id
             WHERE s.exam_id = $1
             GROUP BY t.id, s.id
             ORDER BY s.id, t.id`,
            [examId]
        );

        res.json({
            examId,
            counts: result.rows.map((r) => ({
                topic_id: r.topic_id,
                topic_name: r.topic_name,
                subject_id: r.subject_id,
                subject_name: r.subject_name,
                total_count: parseInt(r.total_count || 0, 10),
                easy_count: parseInt(r.easy_count || 0, 10),
                medium_count: parseInt(r.medium_count || 0, 10),
                hard_count: parseInt(r.hard_count || 0, 10),
            })),
        });
    } catch (err) {
        console.error('GET /admin/questions/count-by-topic error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/questions/bulk - Bulk JSON import of questions
// Placed BEFORE /:id to prevent route shadowing
router.post('/bulk', async (req, res) => {
    const { questions: questionList, exam_id: reqExamId } = req.body;

    if (!Array.isArray(questionList) || questionList.length === 0) {
        return res.status(400).json({ error: 'questions must be a non-empty array' });
    }

    try {
        const examId = await getTargetExamId(reqExamId);
        if (!examId) {
            return res.status(400).json({ error: 'No active exam found' });
        }

        const client = await pool.connect();
        const imported = [];
        const failed = [];

        try {
            await client.query('BEGIN');

            for (let i = 0; i < questionList.length; i++) {
                const q = questionList[i];
                const topicId = parseInt(q.topic_id, 10);
                const difficulty = q.difficulty?.toLowerCase();
                const correctOpt = q.correct_opt?.toLowerCase();
                const body = q.body?.trim();
                const optA = q.option_a?.trim();
                const optB = q.option_b?.trim();
                const optC = q.option_c?.trim();
                const optD = q.option_d?.trim();

                if (!topicId || !body || !optA || !optB || !optC || !optD || !correctOpt) {
                    failed.push({ index: i, item: q, error: 'Missing required question fields' });
                    continue;
                }

                if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                    failed.push({ index: i, item: q, error: `Invalid difficulty: ${difficulty}` });
                    continue;
                }

                if (!['a', 'b', 'c', 'd'].includes(correctOpt)) {
                    failed.push({ index: i, item: q, error: `Invalid correct_opt: ${correctOpt}` });
                    continue;
                }

                const ins = await client.query(
                    `INSERT INTO questions 
                        (exam_id, topic_id, difficulty, body, option_a, option_b, option_c, option_d, correct_opt, explanation, image_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     RETURNING id`,
                    [
                        examId,
                        topicId,
                        difficulty,
                        body,
                        optA,
                        optB,
                        optC,
                        optD,
                        correctOpt,
                        q.explanation ? q.explanation.trim() : null,
                        q.image_url ? q.image_url.trim() : null,
                    ]
                );

                imported.push(ins.rows[0].id);
            }

            await client.query('COMMIT');
            res.json({
                success: true,
                totalProcessed: questionList.length,
                importedCount: imported.length,
                failedCount: failed.length,
                failed,
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('POST /admin/questions/bulk error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/questions - Paginated list of questions with filters
router.get('/', async (req, res) => {
    const {
        exam_id,
        subject_id,
        topic_id,
        difficulty,
        search,
        page = 1,
        limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    try {
        const targetExamId = await getTargetExamId(exam_id);
        const conditions = ['q.is_deleted = false'];
        const params = [];

        if (targetExamId) {
            params.push(targetExamId);
            conditions.push(`q.exam_id = $${params.length}`);
        }
        if (subject_id) {
            params.push(parseInt(subject_id, 10));
            conditions.push(`s.id = $${params.length}`);
        }
        if (topic_id) {
            params.push(parseInt(topic_id, 10));
            conditions.push(`q.topic_id = $${params.length}`);
        }
        if (difficulty) {
            params.push(difficulty.toLowerCase());
            conditions.push(`q.difficulty = $${params.length}`);
        }
        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            conditions.push(`(q.body ILIKE $${params.length} OR q.explanation ILIKE $${params.length})`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const countRes = await pool.query(
            `SELECT COUNT(q.id) 
             FROM questions q
             JOIN topics t ON t.id = q.topic_id
             JOIN subjects s ON s.id = t.subject_id
             ${whereClause}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        params.push(limitNum, offset);
        const dataRes = await pool.query(
            `SELECT 
                q.*,
                t.name AS topic_name,
                s.id AS subject_id,
                s.name AS subject_name
             FROM questions q
             JOIN topics t ON t.id = q.topic_id
             JOIN subjects s ON s.id = t.subject_id
             ${whereClause}
             ORDER BY q.id DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({
            questions: dataRes.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error('GET /admin/questions error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/questions - Add single question (supports optional file upload)
router.post('/', upload.single('image'), async (req, res) => {
    const {
        exam_id,
        topic_id,
        difficulty,
        body,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_opt,
        explanation,
    } = req.body;

    if (!topic_id || !body || !option_a || !option_b || !option_c || !option_d || !correct_opt || !difficulty) {
        return res.status(400).json({
            error: 'Missing required fields: topic_id, difficulty, body, option_a, option_b, option_c, option_d, correct_opt',
        });
    }

    const cleanDiff = difficulty.toLowerCase().trim();
    if (!['easy', 'medium', 'hard'].includes(cleanDiff)) {
        return res.status(400).json({ error: 'Difficulty must be one of: easy, medium, hard' });
    }

    const cleanCorrect = correct_opt.toLowerCase().trim();
    if (!['a', 'b', 'c', 'd'].includes(cleanCorrect)) {
        return res.status(400).json({ error: 'correct_opt must be one of: a, b, c, d' });
    }

    try {
        const targetExamId = await getTargetExamId(exam_id);
        if (!targetExamId) {
            return res.status(400).json({ error: 'No active exam found' });
        }

        // Image URL: uploaded file path or JSON body fallback
        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/questions/${req.file.filename}`;
        } else if (req.body.image_url) {
            imageUrl = req.body.image_url.trim();
        }

        const result = await pool.query(
            `INSERT INTO questions 
                (exam_id, topic_id, difficulty, body, option_a, option_b, option_c, option_d, correct_opt, explanation, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                targetExamId,
                parseInt(topic_id, 10),
                cleanDiff,
                body.trim(),
                option_a.trim(),
                option_b.trim(),
                option_c.trim(),
                option_d.trim(),
                cleanCorrect,
                explanation ? explanation.trim() : null,
                imageUrl,
            ]
        );

        res.status(201).json({ success: true, question: result.rows[0] });
    } catch (err) {
        console.error('POST /admin/questions error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/questions/:id - Update question
router.put('/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const {
        topic_id,
        difficulty,
        body,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_opt,
        explanation,
    } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM questions WHERE id = $1 AND is_deleted = false', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        let imageUrl = existing.rows[0].image_url;
        if (req.file) {
            imageUrl = `/uploads/questions/${req.file.filename}`;
        } else if (req.body.image_url !== undefined) {
            imageUrl = req.body.image_url ? req.body.image_url.trim() : null;
        }

        const updated = await pool.query(
            `UPDATE questions
             SET topic_id = COALESCE($1, topic_id),
                 difficulty = COALESCE($2, difficulty),
                 body = COALESCE($3, body),
                 option_a = COALESCE($4, option_a),
                 option_b = COALESCE($5, option_b),
                 option_c = COALESCE($6, option_c),
                 option_d = COALESCE($7, option_d),
                 correct_opt = COALESCE($8, correct_opt),
                 explanation = COALESCE($9, explanation),
                 image_url = $10
             WHERE id = $11
             RETURNING *`,
            [
                topic_id ? parseInt(topic_id, 10) : null,
                difficulty ? difficulty.toLowerCase().trim() : null,
                body ? body.trim() : null,
                option_a ? option_a.trim() : null,
                option_b ? option_b.trim() : null,
                option_c ? option_c.trim() : null,
                option_d ? option_d.trim() : null,
                correct_opt ? correct_opt.toLowerCase().trim() : null,
                explanation !== undefined ? (explanation ? explanation.trim() : null) : null,
                imageUrl,
                id,
            ]
        );

        res.json({ success: true, question: updated.rows[0] });
    } catch (err) {
        console.error('PUT /admin/questions/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /admin/questions/:id - Soft delete
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE questions SET is_deleted = true WHERE id = $1 RETURNING id`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }

        res.json({ success: true, message: `Question ${id} deleted.` });
    } catch (err) {
        console.error('DELETE /admin/questions/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
