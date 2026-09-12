const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

// ============================================================
// PUBLIC ROUTE: POST /exam/join
// Joins an exam session (initial join or resume on new device)
// ============================================================
router.post('/join', async (req, res) => {
    const { token } = req.body;

    if (!token || !token.trim()) {
        return res.status(400).json({ error: 'Exam token is required' });
    }

    const cleanToken = token.trim().toUpperCase();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Lookup candidate by token WITH ROW LOCK (FOR UPDATE OF c)
        // This serializes all concurrent join attempts for this candidate!
        const candRes = await client.query(
            `SELECT 
                c.*,
                s.name AS shift_name,
                s.is_active AS shift_is_active,
                s.is_paused AS shift_is_paused,
                s.paused_at AS shift_paused_at,
                s.started_at AS shift_started_at,
                s.ended_at AS shift_ended_at,
                s.extra_time_min AS shift_extra_time_min,
                s.paper_generated,
                ec.id AS exam_id,
                ec.name AS exam_name,
                ec.grace_join_min,
                ec.total_duration_min,
                ec.questions_per_shift
             FROM candidates c
             JOIN shifts s ON s.id = c.shift_id
             JOIN exam_config ec ON ec.id = s.exam_id
             WHERE UPPER(c.token) = $1
             FOR UPDATE OF c`,
            [cleanToken]
        );

        if (candRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invalid exam token. Please verify your token and try again.' });
        }

        const candidate = candRes.rows[0];

        // 2. Validate shift state
        if (!candidate.shift_is_active && !candidate.shift_started_at) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Shift '${candidate.shift_name}' has not started yet. Please wait for the invigilator to start the shift.`,
            });
        }

        if (candidate.shift_ended_at) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: `Shift '${candidate.shift_name}' has already concluded. Exam access is closed.`,
            });
        }

        // 3. Check for existing session (locked FOR UPDATE)
        const sessionRes = await client.query(
            `SELECT * FROM candidate_sessions WHERE candidate_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
            [candidate.id]
        );
        const existingSession = sessionRes.rows[0];

        // Case A: Exam already submitted
        if (existingSession && existingSession.is_submitted) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'Exam already completed and submitted. Multiple submissions are not allowed.',
                submittedAt: existingSession.submitted_at,
                score: existingSession.score,
            });
        }

        const now = new Date();

        // Evict any existing socket for this candidate immediately (Layer 1 enforcement for both Case B and Case C)
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');
        const existingSocketId = userSockets?.get(String(candidate.id));
        if (io && existingSocketId) {
            io.to(existingSocketId).emit('force_logout', { message: 'Logged in from another device. Session terminated.' });
            userSockets.delete(String(candidate.id));
        }

        // Case B: RESUME EXISTING IN-PROGRESS SESSION (e.g. reconnect or device switch)
        if (candidate.token_used && existingSession && !existingSession.is_submitted) {
            // Increment session_version to invalidate old JWTs
            const verRes = await client.query(
                `UPDATE candidates SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version`,
                [candidate.id]
            );
            const newSessionVersion = verRes.rows[0].session_version;

            // Determine remaining time against server clock (immutable end_time)
            const effectiveNow = (candidate.shift_is_paused && candidate.shift_paused_at)
                ? new Date(candidate.shift_paused_at)
                : now;

            const sessionEndTime = new Date(existingSession.end_time);
            if (effectiveNow.getTime() >= sessionEndTime.getTime()) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    error: 'Exam time has expired for this candidate. Access is closed.',
                    isExpired: true,
                    endTime: existingSession.end_time,
                });
            }

            const remainingSec = Math.max(0, Math.floor((sessionEndTime.getTime() - effectiveNow.getTime()) / 1000));

            // DO NOT overwrite end_time! Maintain immutable server-authoritative deadline
            const updatedSessionRes = await client.query(
                `UPDATE candidate_sessions
                 SET tab_is_active = true,
                     last_active_at = $1,
                     time_remaining_sec = $2
                 WHERE id = $3
                 RETURNING *`,
                [now, remainingSec, existingSession.id]
            );
            const activeSession = updatedSessionRes.rows[0];

            // Fetch existing shuffled questions with candidate answers
            const questionsRes = await client.query(
                `SELECT 
                    cq.position,
                    cq.question_id,
                    q.body,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.image_url,
                    q.difficulty,
                    t.name AS topic_name,
                    s.name AS subject_name,
                    cq.selected_opt,
                    cq.is_marked
                 FROM candidate_questions cq
                 JOIN questions q ON q.id = cq.question_id
                 JOIN topics t ON t.id = q.topic_id
                 JOIN subjects s ON s.id = t.subject_id
                 WHERE cq.candidate_id = $1
                 ORDER BY cq.position ASC`,
                [candidate.id]
            );

            await client.query('COMMIT');

            // Sign candidate JWT
            const jwtToken = jwt.sign(
                {
                    candidateId: candidate.id,
                    shiftId: candidate.shift_id,
                    sessionId: activeSession.id,
                    sessionVersion: newSessionVersion,
                    role: 'candidate',
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '9h' }
            );

            return res.json({
                success: true,
                isResume: true,
                token: jwtToken,
                candidate: {
                    id: candidate.id,
                    name: candidate.name,
                    roll_no: candidate.roll_no,
                    branch: candidate.branch,
                    section: candidate.section,
                    shift_id: candidate.shift_id,
                    shift_name: candidate.shift_name,
                },
                session: {
                    id: activeSession.id,
                    endTime: activeSession.end_time,
                    timeRemainingSec: remainingSec,
                    isPaused: candidate.shift_is_paused,
                },
                questions: questionsRes.rows,
            });
        }

        // Case C: NEW SESSION INITIAL JOIN
        // Check grace join window
        if (candidate.shift_started_at) {
            const startedAt = new Date(candidate.shift_started_at);
            const graceMinutes = candidate.grace_join_min || 15;
            const graceExpiry = new Date(startedAt.getTime() + graceMinutes * 60 * 1000);

            if (now > graceExpiry) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    error: `The ${graceMinutes}-minute grace join period for shift '${candidate.shift_name}' has expired. You cannot join now. Please contact the invigilator.`,
                });
            }
        }

        // 1. Mark token used
        await client.query(
            `UPDATE candidates 
             SET token_used = true, used_in_shift_id = $1 
             WHERE id = $2`,
            [candidate.shift_id, candidate.id]
        );

        // 2. Fetch student-level weightage rules and pick exactly the right number per topic/difficulty bucket
        const weightageRes = await client.query(
            `SELECT 
                wr.topic_id,
                wr.student_easy_count,
                wr.student_medium_count,
                wr.student_hard_count
             FROM weightage_rules wr
             JOIN shifts s ON s.exam_id = wr.exam_id
             WHERE s.id = $1
             AND (wr.student_easy_count + wr.student_medium_count + wr.student_hard_count) > 0`,
            [candidate.shift_id]
        );

        // Check that question paper was generated for the shift
        const shiftCheckRes = await client.query(
            'SELECT COUNT(*) FROM shift_questions WHERE shift_id = $1',
            [candidate.shift_id]
        );
        if (parseInt(shiftCheckRes.rows[0].count, 10) === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Question paper has not been generated for shift '${candidate.shift_name}'. Please contact the invigilator.`,
            });
        }

        // If no student quotas configured, fall back to all shift questions
        const assignedQuestionIds = [];
        if (weightageRes.rows.length === 0) {
            const fallback = await client.query(
                'SELECT question_id FROM shift_questions WHERE shift_id = $1 ORDER BY RANDOM()',
                [candidate.shift_id]
            );
            assignedQuestionIds.push(...fallback.rows.map(r => r.question_id));
        } else {
            // Quota-driven selection: pick N questions per topic/difficulty bucket from shift pool
            const diffs = ['easy', 'medium', 'hard'];
            for (const rule of weightageRes.rows) {
                for (const diff of diffs) {
                    const quota = parseInt(rule[`student_${diff}_count`], 10) || 0;
                    if (quota === 0) continue;
                    const bucketRes = await client.query(
                        `SELECT sq.question_id
                         FROM shift_questions sq
                         JOIN questions q ON q.id = sq.question_id
                         WHERE sq.shift_id = $1
                           AND q.topic_id = $2
                           AND q.difficulty = $3
                         ORDER BY RANDOM()
                         LIMIT $4`,
                        [candidate.shift_id, rule.topic_id, diff, quota]
                    );
                    if (bucketRes.rows.length < quota) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({
                            error: `Not enough questions in shift pool for topic_id=${rule.topic_id} difficulty=${diff}. Need ${quota}, found ${bucketRes.rows.length}.`,
                        });
                    }
                    assignedQuestionIds.push(...bucketRes.rows.map(r => r.question_id));
                }
            }
            // Shuffle the final 30-question array so order is random
            for (let i = assignedQuestionIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [assignedQuestionIds[i], assignedQuestionIds[j]] = [assignedQuestionIds[j], assignedQuestionIds[i]];
            }
        }

        // 3. Insert unique positions 1..N into candidate_questions (with ON CONFLICT DO NOTHING)
        for (let i = 0; i < assignedQuestionIds.length; i++) {
            await client.query(
                `INSERT INTO candidate_questions (candidate_id, question_id, position)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (candidate_id, question_id) DO NOTHING`,
                [candidate.id, assignedQuestionIds[i], i + 1]
            );
        }

        // 4. Calculate session end time: duration (default 60) + shift extra time
        const totalDurationMin = (candidate.total_duration_min || 60) + (candidate.shift_extra_time_min || 0);
        const totalSec = totalDurationMin * 60;
        const endTime = new Date(now.getTime() + totalSec * 1000);

        const sessionInsertRes = await client.query(
            `INSERT INTO candidate_sessions 
                (candidate_id, shift_id, end_time, active_seconds, time_remaining_sec, tab_is_active)
             VALUES ($1, $2, $3, 0, $4, true)
             RETURNING *`,
            [candidate.id, candidate.shift_id, endTime, totalSec]
        );
        const newSession = sessionInsertRes.rows[0];

        // 5. Increment session_version
        const verRes = await client.query(
            `UPDATE candidates SET session_version = session_version + 1 WHERE id = $1 RETURNING session_version`,
            [candidate.id]
        );
        const sessionVersion = verRes.rows[0].session_version;

        // 6. Fetch questions in shuffled order (WITHOUT correct_opt or explanation)
        const questionsRes = await client.query(
            `SELECT 
                cq.position,
                cq.question_id,
                q.body,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.image_url,
                q.difficulty,
                t.name AS topic_name,
                s.name AS subject_name,
                cq.selected_opt,
                cq.is_marked
             FROM candidate_questions cq
             JOIN questions q ON q.id = cq.question_id
             JOIN topics t ON t.id = q.topic_id
             JOIN subjects s ON s.id = t.subject_id
             WHERE cq.candidate_id = $1
             ORDER BY cq.position ASC`,
            [candidate.id]
        );

        await client.query('COMMIT');

        // Sign JWT
        const jwtToken = jwt.sign(
            {
                candidateId: candidate.id,
                shiftId: candidate.shift_id,
                sessionId: newSession.id,
                sessionVersion,
                role: 'candidate',
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '9h' }
        );

        res.json({
            success: true,
            isResume: false,
            token: jwtToken,
            candidate: {
                id: candidate.id,
                name: candidate.name,
                roll_no: candidate.roll_no,
                branch: candidate.branch,
                section: candidate.section,
                shift_id: candidate.shift_id,
                shift_name: candidate.shift_name,
            },
            session: {
                id: newSession.id,
                endTime: newSession.end_time,
                timeRemainingSec: totalSec,
                isPaused: candidate.shift_is_paused,
            },
            questions: questionsRes.rows,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /exam/join error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================
// ALL ROUTES BELOW REQUIRE CANDIDATE AUTHENTICATION
// ============================================================
router.use(authenticateToken);

// Guard: ensure caller is candidate
function ensureCandidate(req, res, next) {
    if (req.user?.role !== 'candidate') {
        return res.status(403).json({ error: 'Candidate access required' });
    }
    next();
}
router.use(ensureCandidate);

// GET /exam/time-check — Server-authoritative timer re-sync
// Called by client on visibilitychange -> visible or shift_resumed
router.get('/time-check', async (req, res) => {
    const candidateId = req.user.candidateId;
    const now = new Date();

    try {
        const sessRes = await pool.query(
            `SELECT cs.end_time, cs.is_submitted, cs.time_remaining_sec,
                    s.is_paused, s.paused_at
             FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.candidate_id = $1
             ORDER BY cs.id DESC LIMIT 1`,
            [candidateId]
        );

        if (sessRes.rows.length === 0) {
            return res.status(404).json({ error: 'No active session found' });
        }

        const session = sessRes.rows[0];

        if (session.is_submitted) {
            return res.json({ isSubmitted: true, timeRemainingSec: 0 });
        }

        // Server-authoritative remaining time
        // During a pause, clamp to paused_at so time doesn't decay
        const effectiveNow = (session.is_paused && session.paused_at)
            ? new Date(session.paused_at)
            : now;

        const remainingSec = Math.max(
            0,
            Math.floor((new Date(session.end_time).getTime() - effectiveNow.getTime()) / 1000)
        );

        // Update time_remaining_sec snapshot in DB
        await pool.query(
            `UPDATE candidate_sessions SET time_remaining_sec = $1
             WHERE candidate_id = $2 AND is_submitted = false`,
            [remainingSec, candidateId]
        );

        res.json({
            timeRemainingSec: remainingSec,
            endTime: session.end_time,
            isPaused: session.is_paused,
            isSubmitted: false,
        });
    } catch (err) {
        console.error('GET /exam/time-check error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /exam/answer - Upsert selected option for a question
router.post('/answer', async (req, res) => {
    const candidateId = req.user.candidateId;
    const { questionId, selectedOpt } = req.body;

    if (!questionId) {
        return res.status(400).json({ error: 'questionId is required' });
    }

    const cleanOpt = selectedOpt !== null && selectedOpt !== undefined
        ? selectedOpt.toString().toLowerCase().trim()
        : null;

    if (cleanOpt !== null && !['a', 'b', 'c', 'd'].includes(cleanOpt)) {
        return res.status(400).json({ error: "selectedOpt must be 'a', 'b', 'c', 'd', or null to clear" });
    }

    try {
        // Validate session is active and shift is not paused
        const sessRes = await pool.query(
            `SELECT cs.id, cs.end_time, cs.is_submitted, cs.shift_id,
                    s.is_paused AS shift_is_paused, s.paused_at AS shift_paused_at
             FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.candidate_id = $1 
             ORDER BY cs.id DESC LIMIT 1`,
            [candidateId]
        );

        if (sessRes.rows.length === 0 || sessRes.rows[0].is_submitted) {
            return res.status(403).json({ error: 'Cannot record answer: session is not active or already submitted' });
        }

        if (sessRes.rows[0].shift_is_paused) {
            return res.status(503).json({ error: 'Shift is currently paused. Answers cannot be saved.' });
        }

        // Server-side deadline check (with 5-second network buffer)
        const effectiveNow = (sessRes.rows[0].shift_is_paused && sessRes.rows[0].shift_paused_at)
            ? new Date(sessRes.rows[0].shift_paused_at)
            : new Date();
        const ANSWER_GRACE_MS = 5000;
        if (effectiveNow.getTime() > new Date(sessRes.rows[0].end_time).getTime() + ANSWER_GRACE_MS) {
            return res.status(403).json({ error: 'Cannot record answer: Exam time has expired.' });
        }

        // Upsert answer in candidate_questions
        const answeredAt = cleanOpt ? new Date() : null;
        const updateRes = await pool.query(
            `UPDATE candidate_questions
             SET selected_opt = $1,
                 answered_at = $2
             WHERE candidate_id = $3 AND question_id = $4
             RETURNING position, question_id, selected_opt, is_marked, answered_at`,
            [cleanOpt, answeredAt, candidateId, questionId]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found in your assigned paper' });
        }

        res.json({
            success: true,
            questionId: parseInt(questionId, 10),
            selectedOpt: cleanOpt,
            answeredAt: updateRes.rows[0].answered_at,
        });
    } catch (err) {
        console.error('POST /exam/answer error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /exam/mark - Toggle mark-for-review
router.post('/mark', async (req, res) => {
    const candidateId = req.user.candidateId;
    const { questionId, isMarked } = req.body;

    if (!questionId || typeof isMarked !== 'boolean') {
        return res.status(400).json({ error: 'questionId and boolean isMarked are required' });
    }

    try {
        // Validate session is active and shift is not paused
        const sessRes = await pool.query(
            `SELECT cs.id, cs.end_time, cs.is_submitted,
                    s.is_paused AS shift_is_paused, s.paused_at AS shift_paused_at
             FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.candidate_id = $1 
             ORDER BY cs.id DESC LIMIT 1`,
            [candidateId]
        );

        if (sessRes.rows.length === 0 || sessRes.rows[0].is_submitted) {
            return res.status(403).json({ error: 'Cannot update mark: session is not active or already submitted' });
        }

        if (sessRes.rows[0].shift_is_paused) {
            return res.status(503).json({ error: 'Shift is currently paused. Marking cannot be updated.' });
        }

        // Server-side deadline check (with 5-second network buffer)
        const effectiveNow = (sessRes.rows[0].shift_is_paused && sessRes.rows[0].shift_paused_at)
            ? new Date(sessRes.rows[0].shift_paused_at)
            : new Date();
        const MARK_GRACE_MS = 5000;
        if (effectiveNow.getTime() > new Date(sessRes.rows[0].end_time).getTime() + MARK_GRACE_MS) {
            return res.status(403).json({ error: 'Cannot update mark: Exam time has expired.' });
        }

        const updateRes = await pool.query(
            `UPDATE candidate_questions
             SET is_marked = $1
             WHERE candidate_id = $2 AND question_id = $3
             RETURNING position, question_id, is_marked`,
            [isMarked, candidateId, questionId]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found in your assigned paper' });
        }

        res.json({
            success: true,
            questionId: parseInt(questionId, 10),
            isMarked,
        });
    } catch (err) {
        console.error('POST /exam/mark error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /exam/submit - Submit exam and compute score (Idempotent & Concurrency-Safe)
router.post('/submit', async (req, res) => {
    const candidateId = req.user.candidateId;
    const now = new Date();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const sessRes = await client.query(
            `SELECT cs.*, s.name AS shift_name,
                    s.is_paused AS shift_is_paused, s.paused_at AS shift_paused_at
             FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.candidate_id = $1 
             ORDER BY cs.id DESC LIMIT 1
             FOR UPDATE OF cs`,
            [candidateId]
        );

        if (sessRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Exam session not found' });
        }

        const session = sessRes.rows[0];

        // Idempotency: If already submitted (e.g. via admin end-shift or prior submit), return 200 OK with score
        if (session.is_submitted) {
            const existingRes = await client.query(
                `SELECT * FROM results WHERE candidate_id = $1 AND shift_id = $2 ORDER BY id DESC LIMIT 1`,
                [candidateId, session.shift_id]
            );
            await client.query('COMMIT');
            return res.status(200).json({
                success: true,
                isAlreadySubmitted: true,
                message: 'Exam has already been submitted.',
                score: session.score,
                result: existingRes.rows[0] || null,
                submitted_at: session.submitted_at,
            });
        }

        // Server-side Submission Gatekeeping (Blueprint Step 4)
        const NETWORK_GRACE_MS = 10000; // 10s buffer for network transit and queue delays
        const effectiveNow = (session.shift_is_paused && session.shift_paused_at)
            ? new Date(session.shift_paused_at)
            : now;
        const deadline = new Date(session.end_time).getTime() + NETWORK_GRACE_MS;

        if (effectiveNow.getTime() > deadline) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Submission rejected: Exam time has expired.' });
        }

        // Compute correct, wrong, skipped counts
        const evalRes = await client.query(
            `SELECT 
                COUNT(cq.id) AS total_questions,
                COUNT(cq.id) FILTER (WHERE cq.selected_opt = q.correct_opt) AS correct_count,
                COUNT(cq.id) FILTER (WHERE cq.selected_opt IS NOT NULL AND cq.selected_opt != q.correct_opt) AS wrong_count,
                COUNT(cq.id) FILTER (WHERE cq.selected_opt IS NULL) AS skipped_count
             FROM candidate_questions cq
             JOIN questions q ON q.id = cq.question_id
             WHERE cq.candidate_id = $1`,
            [candidateId]
        );

        const counts = evalRes.rows[0];
        const totalQuestions = parseInt(counts.total_questions || 75, 10);
        const correctCount = parseInt(counts.correct_count || 0, 10);
        const wrongCount = parseInt(counts.wrong_count || 0, 10);
        const skippedCount = parseInt(counts.skipped_count || 0, 10);
        const score = correctCount; // No negative marking
        const timeTakenSec = session.active_seconds || 0;

        // Insert into results (guarded by UNIQUE constraint on candidate_id, shift_id)
        const resultInsertRes = await client.query(
            `INSERT INTO results 
                (candidate_id, shift_id, score, total_questions, correct_count, wrong_count, skipped_count, time_taken_sec, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (candidate_id, shift_id) DO NOTHING
             RETURNING *`,
            [
                candidateId,
                session.shift_id,
                score,
                totalQuestions,
                correctCount,
                wrongCount,
                skippedCount,
                timeTakenSec,
                now,
            ]
        );

        // Update candidate_sessions
        await client.query(
            `UPDATE candidate_sessions
             SET is_submitted = true,
                 submitted_at = $1,
                 score = $2,
                 tab_is_active = false
             WHERE id = $3`,
            [now, score, session.id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Exam submitted successfully.',
            score,
            total_questions: totalQuestions,
            correct_count: correctCount,
            wrong_count: wrongCount,
            skipped_count: skippedCount,
            time_taken_sec: timeTakenSec,
            submitted_at: now,
            result: resultInsertRes.rows[0] || null,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /exam/submit error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /exam/status - Check session status and fetch answers for reconnect/page reload
router.get('/status', async (req, res) => {
    const candidateId = req.user.candidateId;
    const now = new Date();

    try {
        const sessRes = await pool.query(
            `SELECT cs.*, s.name AS shift_name, s.is_paused AS shift_is_paused, s.paused_at AS shift_paused_at, s.is_active AS shift_is_active
             FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             WHERE cs.candidate_id = $1
             ORDER BY cs.id DESC LIMIT 1`,
            [candidateId]
        );

        if (sessRes.rows.length === 0) {
            return res.status(404).json({ error: 'No session found for candidate' });
        }

        const session = sessRes.rows[0];

        // Fetch candidate questions answers & marks
        const qRes = await pool.query(
            `SELECT position, question_id, selected_opt, is_marked
             FROM candidate_questions
             WHERE candidate_id = $1
             ORDER BY position ASC`,
            [candidateId]
        );

        const answers = {};
        const markedQuestions = [];

        for (const row of qRes.rows) {
            if (row.selected_opt) {
                answers[row.question_id] = row.selected_opt;
            }
            if (row.is_marked) {
                markedQuestions.push(row.question_id);
            }
        }

        const effectiveNow = (session.shift_is_paused && session.shift_paused_at)
            ? new Date(session.shift_paused_at)
            : now;
        const remainingSec = Math.max(
            0,
            Math.floor((new Date(session.end_time).getTime() - effectiveNow.getTime()) / 1000)
        );

        res.json({
            isSubmitted: session.is_submitted,
            submittedAt: session.submitted_at,
            score: session.score,
            timeRemainingSec: remainingSec,
            endTime: session.end_time,
            isPaused: session.shift_is_paused,
            answers,
            markedQuestions,
            totalAnswered: Object.keys(answers).length,
            totalMarked: markedQuestions.length,
            totalQuestions: qRes.rows.length,
        });
    } catch (err) {
        console.error('GET /exam/status error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
