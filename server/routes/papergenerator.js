const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

/**
 * POST /admin/generate/:examId
 * Multi-shift paper generation algorithm with flexible constraints:
 *
 * F1 — shift_ids[]: Admin selects which shifts to generate for (optional; falls back to first N by creation order)
 * F2 — allow_question_reuse: boolean — if true, questions can appear in multiple shifts
 * F3 — override_mismatch: boolean — if weightage total !== questionsPerShift, caller must pass this flag to proceed;
 *        paper size for each shift will then equal totalRuleQuestions (not questionsPerShift)
 */
router.post('/:examId', async (req, res) => {
    const { examId } = req.params;
    const force = req.query.force === 'true' || req.body.force === true;

    // F2: allow question reuse across shifts
    const allowReuse = req.body.allow_question_reuse === true;

    // F3: caller acknowledges mismatch between weightage total and questionsPerShift
    const overrideMismatch = req.body.override_mismatch === true;

    // F1: optional list of specific shift IDs to generate for
    const requestedShiftIds = Array.isArray(req.body.shift_ids) && req.body.shift_ids.length > 0
        ? [...new Set(req.body.shift_ids.map((id) => parseInt(id, 10)).filter(Boolean))]
        : null;

    // Legacy: num_shifts fallback (ignored if shift_ids provided)
    const numShiftsLegacy = requestedShiftIds ? null : parseInt(req.body.num_shifts, 10);

    if (!requestedShiftIds && (!numShiftsLegacy || numShiftsLegacy < 1)) {
        return res.status(400).json({ error: 'Provide shift_ids array or num_shifts (>= 1)' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch exam config
        const examRes = await client.query('SELECT * FROM exam_config WHERE id = $1', [examId]);
        if (examRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Exam not found' });
        }
        const exam = examRes.rows[0];
        const questionsPerShift = exam.questions_per_shift || 75;

        // 2. Resolve target shifts
        let shiftsRes;
        if (requestedShiftIds) {
            // F1: validate all IDs belong to this exam
            shiftsRes = await client.query(
                `SELECT id, name, paper_generated FROM shifts
                 WHERE exam_id = $1 AND id = ANY($2::int[])
                 ORDER BY id ASC`,
                [examId, requestedShiftIds]
            );
            const foundIds = shiftsRes.rows.map((s) => s.id);
            const missingIds = requestedShiftIds.filter((id) => !foundIds.includes(id));
            if (missingIds.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Shift IDs [${missingIds.join(', ')}] do not belong to exam ${examId} or do not exist.`,
                });
            }
        } else {
            // Legacy: pick first N shifts by creation order
            shiftsRes = await client.query(
                'SELECT id, name, paper_generated FROM shifts WHERE exam_id = $1 ORDER BY id ASC LIMIT $2',
                [examId, numShiftsLegacy]
            );
            if (shiftsRes.rows.length < numShiftsLegacy) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Exam only has ${shiftsRes.rows.length} shift(s). You requested ${numShiftsLegacy}. Please create shifts first.`,
                });
            }
        }

        const targetShifts = shiftsRes.rows;
        const targetShiftIds = targetShifts.map((s) => s.id);
        const numShifts = targetShifts.length;

        // 3. Check if any target shift already has candidate sessions
        const sessionCheck = await client.query(
            `SELECT cs.id, s.name FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.shift_id = ANY($1::int[]) LIMIT 1`,
            [targetShiftIds]
        );
        if (sessionCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Cannot regenerate papers: candidates have already started sessions in shift '${sessionCheck.rows[0].name}'.`,
            });
        }

        // 4. Handle existing papers (force overwrite)
        const existingPaperCheck = await client.query(
            `SELECT COUNT(*) FROM shift_questions WHERE shift_id = ANY($1::int[])`,
            [targetShiftIds]
        );
        const existingCount = parseInt(existingPaperCheck.rows[0].count, 10);

        if (existingCount > 0) {
            if (!force) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    error: `Papers already exist for one or more target shifts. Use force=true to overwrite.`,
                    needsConfirmation: true,
                });
            }
            await client.query(`DELETE FROM shift_questions WHERE shift_id = ANY($1::int[])`, [targetShiftIds]);
        }

        // 5. Fetch and validate weightage rules
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

        if (rulesRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No weightage rules configured for this exam. Please set up the Weightage Preset first.' });
        }

        let totalRuleQuestions = 0;
        for (const r of rulesRes.rows) {
            totalRuleQuestions += parseInt(r.topic_total, 10);
        }

        // F3: Soft mismatch — warn instead of hard block
        if (totalRuleQuestions !== questionsPerShift) {
            if (!overrideMismatch) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Weightage total (${totalRuleQuestions}) differs from target questions per shift (${questionsPerShift}).`,
                    mismatch: true,
                    totalRuleQuestions,
                    questionsPerShift,
                    hint: 'Pass override_mismatch: true to proceed. The effective paper size will be ' + totalRuleQuestions + ' questions per shift.',
                });
            }
            // override accepted — effective paper size is the weightage total
        }

        // Effective paper size
        const effectivePaperSize = overrideMismatch ? totalRuleQuestions : questionsPerShift;

        // 6. Validate available pool depth
        const difficulties = ['easy', 'medium', 'hard'];
        const shortfalls = [];

        for (const r of rulesRes.rows) {
            for (const diff of difficulties) {
                const perShiftCount = parseInt(r[`${diff}_count`], 10) || 0;
                // F2: if reuse allowed, only need perShiftCount per shift (not × numShifts)
                const totalNeeded = allowReuse ? perShiftCount : perShiftCount * numShifts;

                if (totalNeeded > 0) {
                    // In strict mode, questions already assigned to another shift in this
                    // exam remain unavailable. The database no longer enforces this
                    // globally because reuse mode deliberately permits overlap.
                    const countRes = await client.query(
                        `SELECT COUNT(*) FROM questions q
                         WHERE q.exam_id = $1 AND q.topic_id = $2 AND q.difficulty = $3
                           AND q.is_deleted = false
                           AND ($4::boolean OR NOT EXISTS (
                               SELECT 1
                               FROM shift_questions sq
                               JOIN shifts assigned_shift ON assigned_shift.id = sq.shift_id
                               WHERE sq.question_id = q.id
                                 AND assigned_shift.exam_id = $1
                                 AND NOT (sq.shift_id = ANY($5::int[]))
                           ))`,
                        [examId, r.topic_id, diff, allowReuse, targetShiftIds]
                    );
                    const available = parseInt(countRes.rows[0].count, 10);

                    if (available < totalNeeded) {
                        shortfalls.push({
                            topic_id: r.topic_id,
                            topic_name: r.topic_name,
                            difficulty: diff,
                            perShiftNeeded: perShiftCount,
                            totalNeeded,
                            available,
                            shortfall: totalNeeded - available,
                        });
                    }
                }
            }
        }

        if (shortfalls.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: allowReuse
                    ? 'Insufficient questions in bank even with reuse allowed. Please add more questions.'
                    : 'Insufficient questions for non-overlapping papers. Enable question reuse or add more questions.',
                shortfalls,
                allowReuse,
            });
        }

        // 7. Generate and assign questions per shift
        const shiftQuestionMap = {};
        for (const s of targetShifts) {
            shiftQuestionMap[s.id] = [];
        }

        if (allowReuse) {
            // F2: Reuse mode — each shift independently draws its own random pool
            for (const r of rulesRes.rows) {
                for (const diff of difficulties) {
                    const perShiftCount = parseInt(r[`${diff}_count`], 10) || 0;
                    if (perShiftCount === 0) continue;

                    for (const s of targetShifts) {
                        const poolRes = await client.query(
                            `SELECT id FROM questions
                             WHERE exam_id = $1 AND topic_id = $2 AND difficulty = $3 AND is_deleted = false
                             ORDER BY RANDOM()
                             LIMIT $4`,
                            [examId, r.topic_id, diff, perShiftCount]
                        );
                        shiftQuestionMap[s.id].push(...poolRes.rows.map((row) => row.id));
                    }
                }
            }
        } else {
            // Non-reuse mode — partition questions across shifts, tracking used IDs in memory
            const usedQuestionIds = new Set();

            for (const r of rulesRes.rows) {
                for (const diff of difficulties) {
                    const perShiftCount = parseInt(r[`${diff}_count`], 10) || 0;
                    const neededTotal = perShiftCount * numShifts;
                    if (neededTotal === 0) continue;

                    // Pull enough unique questions, excluding already-used ones globally
                    // We fetch extra to account for any already-used IDs in this pool
                    const poolRes = await client.query(
                        `SELECT q.id FROM questions q
                         WHERE q.exam_id = $1 AND q.topic_id = $2 AND q.difficulty = $3
                           AND q.is_deleted = false
                           AND NOT EXISTS (
                               SELECT 1
                               FROM shift_questions sq
                               JOIN shifts assigned_shift ON assigned_shift.id = sq.shift_id
                               WHERE sq.question_id = q.id
                                 AND assigned_shift.exam_id = $1
                                 AND NOT (sq.shift_id = ANY($4::int[]))
                           )
                         ORDER BY RANDOM()
                         LIMIT $5`,
                        [examId, r.topic_id, diff, targetShiftIds, neededTotal]
                    );

                    const questionPool = poolRes.rows
                        .map((row) => row.id)
                        .filter((id) => !usedQuestionIds.has(id));

                    // Partition the pool into numShifts non-overlapping slices
                    for (let sIdx = 0; sIdx < numShifts; sIdx++) {
                        const shiftId = targetShifts[sIdx].id;
                        const start = sIdx * perShiftCount;
                        const slice = questionPool.slice(start, start + perShiftCount);
                        shiftQuestionMap[shiftId].push(...slice);
                        slice.forEach((id) => usedQuestionIds.add(id));
                    }
                }
            }
        }

        // 8. Insert all assigned questions
        for (const s of targetShifts) {
            const qIds = shiftQuestionMap[s.id];
            if (qIds.length !== effectivePaperSize) {
                throw new Error(
                    `Shift '${s.name}' received ${qIds.length} questions, expected ${effectivePaperSize}. ` +
                    `This may indicate a question bank shortage. Please check your bank.`
                );
            }

            for (const qId of qIds) {
                await client.query(
                    `INSERT INTO shift_questions (shift_id, question_id) VALUES ($1, $2)
                     ON CONFLICT (shift_id, question_id) DO NOTHING`,
                    [s.id, qId]
                );
            }

            // Mark paper as generated
            await client.query(`UPDATE shifts SET paper_generated = true WHERE id = $1`, [s.id]);
        }

        await client.query('COMMIT');

        // 9. Build response summary
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
            message: `Successfully generated papers for ${numShifts} shift(s).`,
            examId: parseInt(examId, 10),
            effectivePaperSize,
            allowedReuse: allowReuse,
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

/**
 * DELETE /admin/generate/:examId/papers
 * Deletes generated question papers for the specified shifts (or all shifts in the exam)
 * and resets shifts.paper_generated to false, unlocking exam configuration.
 */
router.delete('/:examId/papers', async (req, res) => {
    const { examId } = req.params;
    const requestedShiftIds = Array.isArray(req.body?.shift_ids) && req.body.shift_ids.length > 0
        ? [...new Set(req.body.shift_ids.map((id) => parseInt(id, 10)).filter(Boolean))]
        : (req.query.shift_ids
            ? String(req.query.shift_ids).split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean)
            : null);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let targetShiftsQuery;
        let targetShiftsParams;
        if (requestedShiftIds && requestedShiftIds.length > 0) {
            targetShiftsQuery = `SELECT id, name, paper_generated FROM shifts WHERE exam_id = $1 AND id = ANY($2::int[])`;
            targetShiftsParams = [examId, requestedShiftIds];
        } else {
            targetShiftsQuery = `SELECT id, name, paper_generated FROM shifts WHERE exam_id = $1 AND paper_generated = true`;
            targetShiftsParams = [examId];
        }

        const shiftsRes = await client.query(targetShiftsQuery, targetShiftsParams);
        if (shiftsRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'No matching shifts found with generated papers.' });
        }

        const targetShiftIds = shiftsRes.rows.map((s) => s.id);

        // Safety check: ensure no candidate sessions exist in these shifts
        const sessionCheck = await client.query(
            `SELECT cs.id, s.name FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.shift_id = ANY($1::int[]) LIMIT 1`,
            [targetShiftIds]
        );
        if (sessionCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Cannot delete question paper: candidates have existing sessions in shift '${sessionCheck.rows[0].name}'. Please reset candidate sessions first.`,
            });
        }

        // Delete assigned questions
        const deletedQuestionsRes = await client.query(
            `DELETE FROM shift_questions WHERE shift_id = ANY($1::int[])`,
            [targetShiftIds]
        );

        // Reset paper_generated flag on shifts
        await client.query(
            `UPDATE shifts SET paper_generated = false WHERE id = ANY($1::int[])`,
            [targetShiftIds]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Question papers successfully deleted for ${targetShiftIds.length} shift(s). Exam configuration is now unlocked.`,
            cleared_shift_ids: targetShiftIds,
            cleared_shifts: shiftsRes.rows.map((s) => ({ id: s.id, name: s.name })),
            deleted_questions_count: deletedQuestionsRes.rowCount || 0,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DELETE /admin/generate/:examId/papers error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

/**
 * GET /admin/generate/shift/:shiftId/questions
 * Returns questions generated for a shift with topic, subject, marks, and difficulty breakdown.
 */
router.get('/shift/:shiftId/questions', async (req, res) => {
    const { shiftId } = req.params;
    try {
        const shiftRes = await pool.query(
            `SELECT s.id, s.name, s.paper_generated, s.exam_id, ec.name AS exam_name
             FROM shifts s
             LEFT JOIN exam_config ec ON ec.id = s.exam_id
             WHERE s.id = $1`,
            [shiftId]
        );

        if (shiftRes.rows.length === 0) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        const shift = shiftRes.rows[0];

        const questionsRes = await pool.query(
            `SELECT 
                sq.id AS shift_question_id,
                q.id,
                q.difficulty,
                q.body,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_opt,
                q.explanation,
                q.marks,
                q.negative_marks,
                q.image_url,
                t.id AS topic_id,
                t.name AS topic_name,
                s.id AS subject_id,
                s.name AS subject_name
             FROM shift_questions sq
             JOIN questions q ON q.id = sq.question_id
             LEFT JOIN topics t ON t.id = q.topic_id
             LEFT JOIN subjects s ON s.id = t.subject_id
             WHERE sq.shift_id = $1
             ORDER BY sq.id ASC`,
            [shiftId]
        );

        const questions = questionsRes.rows;
        let totalMarks = 0;
        const breakdown = { easy: 0, medium: 0, hard: 0 };

        for (const q of questions) {
            totalMarks += parseFloat(q.marks || 0);
            const diff = (q.difficulty || '').toLowerCase();
            if (breakdown[diff] !== undefined) {
                breakdown[diff]++;
            }
        }

        res.json({
            success: true,
            shift: {
                id: shift.id,
                name: shift.name,
                exam_id: shift.exam_id,
                exam_name: shift.exam_name,
                paper_generated: shift.paper_generated,
            },
            totalQuestions: questions.length,
            totalMarks: Math.round(totalMarks * 100) / 100,
            breakdown,
            questions,
        });
    } catch (err) {
        console.error('GET /admin/generate/shift/:shiftId/questions error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
