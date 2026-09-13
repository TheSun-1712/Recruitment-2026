const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// GET /admin/weightage/:examId - Get all rules with subject & topic details
router.get('/:examId', async (req, res) => {
    const { examId } = req.params;

    try {
        const examRes = await pool.query('SELECT * FROM exam_config WHERE id = $1', [examId]);
        if (examRes.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const rulesRes = await pool.query(
            `SELECT 
                wr.id,
                wr.exam_id,
                wr.topic_id,
                t.name AS topic_name,
                s.id AS subject_id,
                s.name AS subject_name,
                wr.easy_count,
                wr.medium_count,
                wr.hard_count,
                wr.student_easy_count,
                wr.student_medium_count,
                wr.student_hard_count,
                (wr.easy_count + wr.medium_count + wr.hard_count) AS row_total
             FROM weightage_rules wr
             JOIN topics t ON t.id = wr.topic_id
             JOIN subjects s ON s.id = t.subject_id
             WHERE wr.exam_id = $1
             ORDER BY s.id, t.id`,
            [examId]
        );

        res.json({
            exam: examRes.rows[0],
            rules: rulesRes.rows,
        });
    } catch (err) {
        console.error('GET /admin/weightage/:examId error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/weightage/:examId - Upsert all rules (array of {topic_id, easy_count, medium_count, hard_count})
router.put('/:examId', async (req, res) => {
    const { examId } = req.params;
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
        return res.status(400).json({ error: 'rules must be an array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // F4: weightage remains editable after generation, but callers need a
        // clear signal that existing papers still use the old blueprint.
        const generatedPapers = await client.query(
            `SELECT 1 FROM shifts WHERE exam_id = $1 AND paper_generated = true LIMIT 1`,
            [examId]
        );
        const requiresRegeneration = generatedPapers.rows.length > 0;

        const upserted = [];
        for (const r of rules) {
            const topicId = parseInt(r.topic_id, 10);
            const easy = Math.max(0, parseInt(r.easy_count, 10) || 0);
            const medium = Math.max(0, parseInt(r.medium_count, 10) || 0);
            const hard = Math.max(0, parseInt(r.hard_count, 10) || 0);
            const studentEasy = Math.max(0, parseInt(r.student_easy_count, 10) || 0);
            const studentMedium = Math.max(0, parseInt(r.student_medium_count, 10) || 0);
            const studentHard = Math.max(0, parseInt(r.student_hard_count, 10) || 0);

            if (!topicId) continue;

            const resRow = await client.query(
                `INSERT INTO weightage_rules 
                    (exam_id, topic_id, easy_count, medium_count, hard_count, student_easy_count, student_medium_count, student_hard_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (exam_id, topic_id) 
                 DO UPDATE SET 
                     easy_count = EXCLUDED.easy_count,
                     medium_count = EXCLUDED.medium_count,
                     hard_count = EXCLUDED.hard_count,
                     student_easy_count = EXCLUDED.student_easy_count,
                     student_medium_count = EXCLUDED.student_medium_count,
                     student_hard_count = EXCLUDED.student_hard_count
                 RETURNING *`,
                [examId, topicId, easy, medium, hard, studentEasy, studentMedium, studentHard]
            );
            upserted.push(resRow.rows[0]);
        }

        await client.query('COMMIT');
        res.json({
            success: true,
            count: upserted.length,
            rules: upserted,
            locked: requiresRegeneration,
            message: requiresRegeneration
                ? 'Papers already exist. Regenerate the affected papers for this weightage to take effect.'
                : undefined,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PUT /admin/weightage/:examId error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /admin/weightage/:examId/validate - Returns total configured vs target (75) + shortfall warnings
router.get('/:examId/validate', async (req, res) => {
    const { examId } = req.params;
    const numShifts = Math.max(1, parseInt(req.query.num_shifts, 10) || 1);
    const allowOverlap = req.query.allow_overlap === 'true';

    try {
        const examRes = await pool.query('SELECT * FROM exam_config WHERE id = $1', [examId]);
        if (examRes.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const exam = examRes.rows[0];
        const targetTotal = exam.questions_per_shift || 75;

        // Fetch all weightage rules
        const rulesRes = await pool.query(
            `SELECT 
                wr.topic_id,
                t.name AS topic_name,
                s.name AS subject_name,
                wr.easy_count,
                wr.medium_count,
                wr.hard_count,
                (wr.easy_count + wr.medium_count + wr.hard_count) AS topic_total
             FROM weightage_rules wr
             JOIN topics t ON t.id = wr.topic_id
             JOIN subjects s ON s.id = t.subject_id
             WHERE wr.exam_id = $1`,
            [examId]
        );

        let grandTotal = 0;
        for (const r of rulesRes.rows) {
            grandTotal += parseInt(r.topic_total, 10);
        }

        // Fetch available question counts in bank per topic & difficulty
        const availRes = await pool.query(
            `SELECT 
                q.topic_id,
                q.difficulty,
                COUNT(q.id) AS available_count
             FROM questions q
             WHERE q.exam_id = $1 AND q.is_deleted = false
             GROUP BY q.topic_id, q.difficulty`,
            [examId]
        );

        const availableMap = {};
        for (const a of availRes.rows) {
            availableMap[`${a.topic_id}_${a.difficulty}`] = parseInt(a.available_count, 10);
        }

        const shortfalls = [];
        const difficulties = ['easy', 'medium', 'hard'];

        for (const r of rulesRes.rows) {
            for (const diff of difficulties) {
                const countKey = `${diff}_count`;
                const perShiftNeeded = parseInt(r[countKey], 10) || 0;
                const totalNeeded = allowOverlap ? perShiftNeeded : perShiftNeeded * numShifts;

                if (totalNeeded > 0) {
                    const available = availableMap[`${r.topic_id}_${diff}`] || 0;
                    if (available < totalNeeded) {
                        shortfalls.push({
                            topic_id: r.topic_id,
                            topic_name: r.topic_name,
                            subject_name: r.subject_name,
                            difficulty: diff,
                            perShiftNeeded,
                            totalNeededForShifts: totalNeeded,
                            availableInBank: available,
                            shortfall: totalNeeded - available,
                        });
                    }
                }
            }
        }

        // Check student quotas: student_X_count must not exceed shift pool count
        const studentShortfalls = [];
        const studentDiffs = ['easy', 'medium', 'hard'];
        let grandStudentTotal = 0;
        for (const r of rulesRes.rows) {
            for (const diff of studentDiffs) {
                const studentCount = parseInt(r[`student_${diff}_count`], 10) || 0;
                const shiftCount = parseInt(r[`${diff}_count`], 10) || 0;
                grandStudentTotal += studentCount;
                if (studentCount > shiftCount) {
                    studentShortfalls.push({
                        topic_name: r.topic_name,
                        subject_name: r.subject_name,
                        difficulty: diff,
                        student_quota: studentCount,
                        shift_pool: shiftCount,
                    });
                }
            }
        }

        const examConfig = examRes.rows[0];
        const targetStudentTotal = examConfig.questions_per_candidate || 30;
        const isStudentTotalMatch = grandStudentTotal === targetStudentTotal;
        const hasStudentShortfall = studentShortfalls.length > 0;

        const isTotalMatch = grandTotal === targetTotal;
        const hasShortfall = shortfalls.length > 0;
        const isValid = isTotalMatch && !hasShortfall && isStudentTotalMatch && !hasStudentShortfall;

        res.json({
            valid: isValid,
            examId: parseInt(examId, 10),
            numShifts,
            totalConfigured: grandTotal,
            targetTotal,
            isTotalMatch,
            shortfallCount: shortfalls.length,
            shortfalls,
            // Student quota
            studentTotalConfigured: grandStudentTotal,
            targetStudentTotal,
            isStudentTotalMatch,
            studentShortfalls,
            rulesBreakdown: rulesRes.rows,
        });
    } catch (err) {
        console.error('GET /admin/weightage/:examId/validate error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
