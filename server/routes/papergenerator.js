const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

/**
 * POST /admin/generate/:examId
 * Core multi-shift paper generation algorithm.
 * Guarantees zero question overlap across shifts via partitioning and UNIQUE(question_id).
 */
router.post('/:examId', async (req, res) => {
    const { examId } = req.params;
    const numShifts = parseInt(req.body.num_shifts, 10);
    const force = req.query.force === 'true' || req.body.force === true;

    if (!numShifts || numShifts < 1) {
        return res.status(400).json({ error: 'num_shifts must be an integer >= 1' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch exam config
        const examRes = await client.query(
            'SELECT * FROM exam_config WHERE id = $1',
            [examId]
        );
        if (examRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Exam not found' });
        }
        const exam = examRes.rows[0];
        const questionsPerShift = exam.questions_per_shift || 75;

        // 2. Fetch created shifts for this exam
        const shiftsRes = await client.query(
            'SELECT id, name, paper_generated FROM shifts WHERE exam_id = $1 ORDER BY id ASC LIMIT $2',
            [examId, numShifts]
        );

        if (shiftsRes.rows.length < numShifts) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Exam only has ${shiftsRes.rows.length} shift(s) configured. You requested generation for ${numShifts} shift(s). Please create shifts first.`,
            });
        }

        const targetShifts = shiftsRes.rows;
        const targetShiftIds = targetShifts.map((s) => s.id);

        // Check if any target shift already has sessions started
        const sessionCheck = await client.query(
            `SELECT cs.id, s.name FROM candidate_sessions cs 
             JOIN shifts s ON s.id = cs.shift_id 
             WHERE cs.shift_id = ANY($1::int[]) LIMIT 1`,
            [targetShiftIds]
        );
        if (sessionCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Cannot regenerate papers: candidates have already started or submitted sessions in shift '${sessionCheck.rows[0].name}'.`,
            });
        }

        // Check if papers already generated
        const existingPaperCheck = await client.query(
            `SELECT COUNT(*) FROM shift_questions WHERE shift_id = ANY($1::int[])`,
            [targetShiftIds]
        );
        const existingCount = parseInt(existingPaperCheck.rows[0].count, 10);

        if (existingCount > 0) {
            if (!force) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    error: `Papers already exist for one or more target shifts. Use ?force=true to overwrite.`,
                    needsConfirmation: true,
                });
            }
            // If force is true, delete existing shift_questions for these shifts
            await client.query(
                `DELETE FROM shift_questions WHERE shift_id = ANY($1::int[])`,
                [targetShiftIds]
            );
        }

        // 3. Validate weightage rules sum
        const rulesRes = await client.query(
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

        let totalRuleQuestions = 0;
        for (const r of rulesRes.rows) {
            totalRuleQuestions += parseInt(r.topic_total, 10);
        }

        if (totalRuleQuestions !== questionsPerShift) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Total questions in weightage rules (${totalRuleQuestions}) does not equal required questions per shift (${questionsPerShift}). Please adjust weightage.`,
            });
        }

        // 4. Validate available pool depth in question bank
        const difficulties = ['easy', 'medium', 'hard'];
        const shortfalls = [];

        for (const r of rulesRes.rows) {
            for (const diff of difficulties) {
                const perShiftCount = parseInt(r[`${diff}_count`], 10) || 0;
                const neededTotal = perShiftCount * numShifts;

                if (neededTotal > 0) {
                    const countRes = await client.query(
                        `SELECT COUNT(*) FROM questions 
                         WHERE topic_id = $1 AND difficulty = $2 AND is_deleted = false`,
                        [r.topic_id, diff]
                    );
                    const available = parseInt(countRes.rows[0].count, 10);

                    if (available < neededTotal) {
                        shortfalls.push({
                            topic_id: r.topic_id,
                            topic_name: r.topic_name,
                            difficulty: diff,
                            neededTotal,
                            available,
                            shortfall: neededTotal - available,
                        });
                    }
                }
            }
        }

        if (shortfalls.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Insufficient questions in question bank to generate non-overlapping papers for all shifts.',
                shortfalls,
            });
        }

        // 5. Generate and partition questions across shifts
        // For each shift index 0..numShifts-1, we will collect question IDs
        const shiftQuestionMap = {};
        for (const s of targetShifts) {
            shiftQuestionMap[s.id] = [];
        }

        for (const r of rulesRes.rows) {
            for (const diff of difficulties) {
                const perShiftCount = parseInt(r[`${diff}_count`], 10) || 0;
                const neededTotal = perShiftCount * numShifts;

                if (neededTotal === 0) continue;

                // Select random pool of questions for this topic + difficulty
                const poolRes = await client.query(
                    `SELECT id FROM questions 
                     WHERE topic_id = $1 AND difficulty = $2 AND is_deleted = false
                     ORDER BY RANDOM()
                     LIMIT $3`,
                    [r.topic_id, diff, neededTotal]
                );

                const questionPool = poolRes.rows.map((row) => row.id);

                // Partition pool into numShifts non-overlapping slices
                for (let sIdx = 0; sIdx < numShifts; sIdx++) {
                    const shiftId = targetShifts[sIdx].id;
                    const start = sIdx * perShiftCount;
                    const end = start + perShiftCount;
                    const slice = questionPool.slice(start, end);
                    shiftQuestionMap[shiftId].push(...slice);
                }
            }
        }

        // 6. Insert all assigned questions into shift_questions
        for (const s of targetShifts) {
            const qIds = shiftQuestionMap[s.id];
            if (qIds.length !== questionsPerShift) {
                throw new Error(
                    `Shift '${s.name}' received ${qIds.length} questions, expected ${questionsPerShift}.`
                );
            }

            for (const qId of qIds) {
                await client.query(
                    `INSERT INTO shift_questions (shift_id, question_id) VALUES ($1, $2)`,
                    [s.id, qId]
                );
            }

            // Lock shift paper
            await client.query(
                `UPDATE shifts SET paper_generated = true WHERE id = $1`,
                [s.id]
            );
        }

        await client.query('COMMIT');

        // Prepare summary breakdown for response
        const shiftSummaries = [];
        for (const s of targetShifts) {
            const countRes = await pool.query(
                `SELECT 
                    COUNT(sq.question_id) AS total_count,
                    COUNT(sq.question_id) FILTER (WHERE q.difficulty = 'easy') AS easy_count,
                    COUNT(sq.question_id) FILTER (WHERE q.difficulty = 'medium') AS medium_count,
                    COUNT(sq.question_id) FILTER (WHERE q.difficulty = 'hard') AS hard_count
                 FROM shift_questions sq
                 JOIN questions q ON q.id = sq.question_id
                 WHERE sq.shift_id = $1`,
                [s.id]
            );

            shiftSummaries.push({
                shift_id: s.id,
                shift_name: s.name,
                question_count: parseInt(countRes.rows[0].total_count, 10),
                breakdown: {
                    easy: parseInt(countRes.rows[0].easy_count, 10),
                    medium: parseInt(countRes.rows[0].medium_count, 10),
                    hard: parseInt(countRes.rows[0].hard_count, 10),
                },
            });
        }

        res.json({
            success: true,
            message: `Successfully generated non-overlapping papers for ${numShifts} shift(s).`,
            examId: parseInt(examId, 10),
            questionsPerShift,
            shifts: shiftSummaries,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /admin/generate/:examId error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
