const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// Helper: get target exam ID (from query or active exam)
async function getTargetExamId(reqExamId) {
    if (reqExamId) return parseInt(reqExamId, 10);
    const active = await pool.query(
        'SELECT id FROM exam_config WHERE is_active = true ORDER BY id DESC LIMIT 1'
    );
    if (active.rows.length > 0) return active.rows[0].id;
    const latest = await pool.query('SELECT id FROM exam_config ORDER BY id DESC LIMIT 1');
    return latest.rows.length > 0 ? latest.rows[0].id : null;
}

// GET /admin/shifts - List all shifts for target exam
router.get('/', async (req, res) => {
    try {
        const examId = await getTargetExamId(req.query.exam_id);
        if (!examId) {
            return res.json({ shifts: [], examId: null });
        }

        const result = await pool.query(
            `SELECT 
                s.*,
                COUNT(DISTINCT c.id) AS candidate_count,
                COUNT(DISTINCT cs.id) FILTER (WHERE cs.is_submitted = false AND cs.end_time > NOW()) AS active_sessions_count,
                COUNT(DISTINCT cs.id) FILTER (WHERE cs.is_submitted = true) AS submitted_count,
                COUNT(DISTINCT sq.question_id) AS assigned_questions_count
             FROM shifts s
             LEFT JOIN candidates c ON c.shift_id = s.id
             LEFT JOIN candidate_sessions cs ON cs.shift_id = s.id
             LEFT JOIN shift_questions sq ON sq.shift_id = s.id
             WHERE s.exam_id = $1
             GROUP BY s.id
             ORDER BY s.id ASC`,
            [examId]
        );

        const shifts = result.rows.map((row) => ({
            ...row,
            candidate_count: parseInt(row.candidate_count || 0, 10),
            active_sessions_count: parseInt(row.active_sessions_count || 0, 10),
            submitted_count: parseInt(row.submitted_count || 0, 10),
            assigned_questions_count: parseInt(row.assigned_questions_count || 0, 10),
        }));

        res.json({ shifts, examId });
    } catch (err) {
        console.error('GET /admin/shifts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/shifts - Create a new shift
router.post('/', async (req, res) => {
    const { exam_id, name, scheduled_start, access_close_at, duration_override_min } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Shift name is required' });
    }

    try {
        const targetExamId = await getTargetExamId(exam_id);
        if (!targetExamId) {
            return res.status(400).json({ error: 'No active exam found. Create an exam first.' });
        }

        const result = await pool.query(
            `INSERT INTO shifts (exam_id, name, scheduled_start, access_close_at, duration_override_min)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                targetExamId, 
                name.trim(), 
                scheduled_start ? new Date(scheduled_start) : null,
                access_close_at ? new Date(access_close_at) : null,
                duration_override_min ? parseInt(duration_override_min, 10) : null
            ]
        );

        res.status(201).json({ success: true, shift: result.rows[0] });
    } catch (err) {
        console.error('POST /admin/shifts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/shifts/:id - Edit a shift
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, scheduled_start, access_close_at, duration_override_min } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        
        const shift = existing.rows[0];
        
        if (shift.is_active || shift.paper_generated || shift.started_at) {
            return res.status(400).json({ error: 'Cannot edit shift once it has started or papers have been generated.' });
        }

        const updated = await pool.query(
            `UPDATE shifts
             SET name = $1,
                 scheduled_start = $2,
                 access_close_at = $3,
                 duration_override_min = $4
             WHERE id = $5
             RETURNING *`,
            [
                name ? name.trim() : shift.name,
                scheduled_start ? new Date(scheduled_start) : null,
                access_close_at ? new Date(access_close_at) : null,
                duration_override_min ? parseInt(duration_override_min, 10) : null,
                id
            ]
        );

        res.json({ success: true, shift: updated.rows[0] });
    } catch (err) {
        console.error('PUT /admin/shifts/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /admin/shifts/:id - Delete a shift
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Shift not found' });
        }
        
        const shift = existing.rows[0];
        if (shift.is_active || shift.paper_generated || shift.started_at) {
            return res.status(400).json({ error: 'Cannot delete shift once it has started or papers have been generated.' });
        }

        const sessionCheck = await pool.query('SELECT COUNT(*) FROM candidate_sessions WHERE shift_id = $1', [id]);
        if (parseInt(sessionCheck.rows[0].count, 10) > 0) {
            return res.status(400).json({ error: 'Cannot delete shift because candidates have active or past sessions in it.' });
        }

        await pool.query('DELETE FROM shifts WHERE id = $1', [id]);
        res.json({ success: true, message: 'Shift deleted successfully' });
    } catch (err) {
        console.error('DELETE /admin/shifts/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/shifts/:id/start - Start a shift
router.post('/:id/start', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        const shift = existing.rows[0];
        const now = new Date();
        const updated = await pool.query(
            `UPDATE shifts 
             SET is_active = true, 
                 is_paused = false, 
                 ended_at = NULL,
                 started_at = $1
             WHERE id = $2
             RETURNING *`,
            [now, id]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`shift:${id}`).emit('shift_started', {
                shiftId: parseInt(id, 10),
                startedAt: now,
            });
            io.to('admin_room').emit('shift_started', {
                shiftId: parseInt(id, 10),
                startedAt: now,
            });
        }

        res.json({ success: true, shift: updated.rows[0] });
    } catch (err) {
        console.error('POST /admin/shifts/:id/start error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/shifts/:id/pause - Pause shift
router.post('/:id/pause', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });

        const shift = existing.rows[0];
        if (!shift.is_active || shift.is_paused) {
            return res.status(400).json({ error: 'Shift is not active or already paused' });
        }

        const now = new Date();
        const updated = await pool.query(
            `UPDATE shifts 
             SET is_paused = true, paused_at = $1 
             WHERE id = $2 
             RETURNING *`,
            [now, id]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`shift:${id}`).emit('shift_paused', {
                shiftId: parseInt(id, 10),
                pausedAt: now,
            });
            io.to('admin_room').emit('shift_paused', {
                shiftId: parseInt(id, 10),
                pausedAt: now,
            });
        }

        res.json({ success: true, shift: updated.rows[0] });
    } catch (err) {
        console.error('POST /admin/shifts/:id/pause error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/shifts/:id/resume - Resume paused shift
router.post('/:id/resume', async (req, res) => {
    const { id } = req.params;
    const now = new Date();
    try {
        const existing = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });

        const shift = existing.rows[0];
        if (!shift.is_paused || !shift.paused_at) {
            return res.status(400).json({ error: 'Shift is not paused' });
        }

        const pauseDurationMs = now.getTime() - new Date(shift.paused_at).getTime();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Shift forward all active/unsubmitted sessions' end_time (only sessions that hadn't expired before pause)
            await client.query(
                `UPDATE candidate_sessions
                 SET end_time = end_time + ($1 || ' milliseconds')::interval,
                     time_remaining_sec = NULL
                 WHERE shift_id = $2 AND is_submitted = false AND end_time > $3`,
                [pauseDurationMs, id, shift.paused_at]
            );

            // Clear shift pause state
            const updated = await client.query(
                `UPDATE shifts 
                 SET is_paused = false, paused_at = NULL 
                 WHERE id = $1 
                 RETURNING *`,
                [id]
            );

            await client.query('COMMIT');

            const io = req.app.get('io');
            if (io) {
                io.to(`shift:${id}`).emit('shift_resumed', {
                    shiftId: parseInt(id, 10),
                    pauseDurationMs,
                });
                io.to('admin_room').emit('shift_resumed', {
                    shiftId: parseInt(id, 10),
                    pauseDurationMs,
                });
            }

            res.json({ success: true, shift: updated.rows[0], pauseDurationMs });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('POST /admin/shifts/:id/resume error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/shifts/:id/extra-time - Add extra time (N minutes)
router.post('/:id/extra-time', async (req, res) => {
    const { id } = req.params;
    const extraMinutes = parseInt(req.body.extra_minutes, 10);

    if (isNaN(extraMinutes) || extraMinutes <= 0) {
        return res.status(400).json({ error: 'extra_minutes must be a positive integer' });
    }

    try {
        const existing = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update shift extra_time_min
            const shiftRes = await client.query(
                `UPDATE shifts
                 SET extra_time_min = extra_time_min + $1
                 WHERE id = $2
                 RETURNING *`,
                [extraMinutes, id]
            );

            // Extend all unsubmitted candidate sessions and clear stale snapshot
            await client.query(
                `UPDATE candidate_sessions
                 SET end_time = end_time + ($1 || ' minutes')::interval,
                     time_remaining_sec = NULL
                 WHERE shift_id = $2 AND is_submitted = false`,
                [extraMinutes, id]
            );

            await client.query('COMMIT');

            const io = req.app.get('io');
            if (io) {
                io.to(`shift:${id}`).emit('extra_time_granted', {
                    shiftId: parseInt(id, 10),
                    addedMin: extraMinutes,
                });
                io.to('admin_room').emit('extra_time_granted', {
                    shiftId: parseInt(id, 10),
                    addedMin: extraMinutes,
                });
            }

            res.json({ success: true, shift: shiftRes.rows[0], addedMin: extraMinutes });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('POST /admin/shifts/:id/extra-time error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/shifts/:id/end - Force end shift & auto-submit unsubmitted sessions
router.post('/:id/end', async (req, res) => {
    const { id } = req.params;
    const now = new Date();

    try {
        const existing = await pool.query(
            `SELECT s.*, ec.pass_mark_pct, ec.grade_ranges 
             FROM shifts s
             JOIN exam_config ec ON ec.id = s.exam_id
             WHERE s.id = $1`, 
            [id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Mark shift ended
            const shiftRes = await client.query(
                `UPDATE shifts
                 SET is_active = false, is_paused = false, ended_at = $1
                 WHERE id = $2
                 RETURNING *`,
                [now, id]
            );

            // 2. Find unsubmitted sessions (locked FOR UPDATE)
            const unsubmitted = await client.query(
                `SELECT cs.id, cs.candidate_id, cs.active_seconds
                 FROM candidate_sessions cs
                 WHERE cs.shift_id = $1 AND cs.is_submitted = false
                 FOR UPDATE OF cs`,
                [id]
            );

            // Auto-submit each
            for (const sess of unsubmitted.rows) {
                // Compute score
                const scoreRes = await client.query(
                    `SELECT 
                        COUNT(cq.id) AS total_assigned,
                        COUNT(cq.id) FILTER (WHERE cq.selected_opt = q.correct_opt) AS correct_count,
                        COUNT(cq.id) FILTER (WHERE cq.selected_opt IS NOT NULL AND cq.selected_opt != q.correct_opt) AS wrong_count,
                        COUNT(cq.id) FILTER (WHERE cq.selected_opt IS NULL) AS skipped_count,
                        COALESCE(SUM(q.marks), 0) AS total_marks,
                        COALESCE(SUM(CASE
                            WHEN cq.selected_opt = q.correct_opt THEN q.marks
                            WHEN cq.selected_opt IS NOT NULL THEN -q.negative_marks
                            ELSE 0
                        END), 0) AS score
                     FROM candidate_questions cq
                     JOIN questions q ON q.id = cq.question_id
                     WHERE cq.candidate_id = $1`,
                    [sess.candidate_id]
                );

                const counts = scoreRes.rows[0];
                const correct = parseInt(counts.correct_count || 0, 10);
                const wrong = parseInt(counts.wrong_count || 0, 10);
                const skipped = parseInt(counts.skipped_count || 0, 10);
                const total = parseInt(counts.total_assigned || 75, 10);
                const totalMarks = Number(counts.total_marks || 0);
                const score = Number(counts.score || 0);
                
                const shiftData = existing.rows[0];
                const percentage = totalMarks > 0 ? Math.max(0, (score / totalMarks) * 100).toFixed(2) : 0;
                const passMarkPct = parseFloat(shiftData.pass_mark_pct || 50);
                const passFail = parseFloat(percentage) >= passMarkPct ? 'pass' : 'fail';
                
                let grade = null;
                if (shiftData.grade_ranges && Array.isArray(shiftData.grade_ranges)) {
                    const numPct = parseFloat(percentage);
                    for (const range of shiftData.grade_ranges) {
                        if (numPct >= range.min && numPct <= range.max) {
                            grade = range.label;
                            break;
                        }
                    }
                }

                await client.query(
                    `INSERT INTO results 
                        (candidate_id, shift_id, score, total_questions, total_marks, correct_count, wrong_count, skipped_count, time_taken_sec, submitted_at, percentage, pass_fail, grade)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                     ON CONFLICT (candidate_id, shift_id) DO NOTHING`,
                    [sess.candidate_id, id, score, total, totalMarks, correct, wrong, skipped, sess.active_seconds || 0, now, percentage, passFail, grade]
                );

                await client.query(
                    `UPDATE candidate_sessions
                     SET is_submitted = true, submitted_at = $1, score = $2, tab_is_active = false
                     WHERE id = $3`,
                    [now, score, sess.id]
                );
            }

            await client.query('COMMIT');

            const io = req.app.get('io');
            if (io) {
                const endPayload = {
                    shiftId: parseInt(id, 10),
                    endedAt: now,
                    reason: 'Shift concluded by invigilator.',
                };
                io.to(`shift:${id}`).emit('shift_ended', endPayload);
                io.to('admin_room').emit('shift_ended', endPayload);
            }

            res.json({
                success: true,
                shift: shiftRes.rows[0],
                autoSubmittedCount: unsubmitted.rows.length,
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('POST /admin/shifts/:id/end error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/shifts/:id/candidates - List candidates in shift with live session status
router.get('/:id/candidates', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                c.id AS candidate_id,
                c.name,
                c.roll_no,
                c.branch,
                c.section,
                c.email,
                c.token,
                c.token_used,
                cs.id AS session_id,
                cs.join_time,
                cs.end_time,
                cs.active_seconds,
                CASE 
                    WHEN cs.id IS NULL THEN NULL
                    WHEN cs.is_submitted THEN 0
                    WHEN s.is_paused AND s.paused_at IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (cs.end_time - s.paused_at))::int)
                    ELSE GREATEST(0, EXTRACT(EPOCH FROM (cs.end_time - NOW()))::int)
                END AS time_remaining_sec,
                cs.tab_is_active,
                cs.is_submitted,
                cs.submitted_at,
                cs.score,
                COUNT(cq.id) FILTER (WHERE cq.selected_opt IS NOT NULL) AS answered_count,
                COUNT(cq.id) FILTER (WHERE cq.is_marked = true) AS marked_count,
                COUNT(cq.id) AS assigned_questions_count
             FROM candidates c
             JOIN shifts s ON s.id = c.shift_id
             LEFT JOIN candidate_sessions cs ON cs.candidate_id = c.id
             LEFT JOIN candidate_questions cq ON cq.candidate_id = c.id
             WHERE c.shift_id = $1
             GROUP BY c.id, cs.id, s.id
             ORDER BY c.roll_no ASC`,
            [id]
        );

        res.json({
            shiftId: parseInt(id, 10),
            candidates: result.rows.map((row) => ({
                ...row,
                answered_count: parseInt(row.answered_count || 0, 10),
                marked_count: parseInt(row.marked_count || 0, 10),
                assigned_questions_count: parseInt(row.assigned_questions_count || 0, 10),
            })),
        });
    } catch (err) {
        console.error('GET /admin/shifts/:id/candidates error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
