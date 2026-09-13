const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

// ============================================================
// PUBLIC ROUTE: Admin Login
// ============================================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM admins WHERE username = $1',
            [username]
        );
        const admin = result.rows[0];

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = jwt.sign(
            { adminId: admin.id, username: admin.username, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '9h' }
        );

        res.json({ success: true, accessToken });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// PUBLIC ROUTE: Disqualification Report
// Called by client proctoring hook with keepalive: true upon 10 violations
// ============================================================
router.post('/disqualify-report', async (req, res) => {
    const { team_name, round, violations } = req.body;

    try {
        await pool.query(
            `INSERT INTO disqualification_log (team_name, round, violations, reported_at)
             VALUES ($1, $2, $3, NOW())`,
            [team_name || 'Unknown', round || 'exam', violations || 10]
        );

        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('disqualification_event', {
                teamName: team_name || 'Unknown',
                round: round || 'exam',
                violations: violations || 10,
                reportedAt: new Date().toISOString(),
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('POST /admin/disqualify-report error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// ALL ROUTES BELOW REQUIRE ADMIN AUTHENTICATION
// ============================================================
router.use(authenticateToken, authorizeAdmin);

// GET /admin/dashboard-stats - Live counts for admin monitor dashboard
router.get('/dashboard-stats', async (req, res) => {
    try {
        const statsRes = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM candidates) AS total_candidates,
                (SELECT COUNT(*) FROM candidate_sessions WHERE is_submitted = false AND end_time > NOW()) AS active_sessions_count,
                (SELECT COUNT(*) FROM shifts WHERE is_active = true) AS running_shifts_count,
                (SELECT COUNT(*) FROM questions WHERE is_deleted = false) AS total_questions_count,
                (SELECT COUNT(*) FROM results WHERE submitted_at >= CURRENT_DATE) AS submissions_today_count,
                (SELECT COUNT(*) FROM shifts) AS total_shifts_count
        `);

        const row = statsRes.rows[0];
        res.json({
            totalCandidates: parseInt(row.total_candidates || 0, 10),
            activeSessions: parseInt(row.active_sessions_count || 0, 10),
            runningShifts: parseInt(row.running_shifts_count || 0, 10),
            totalQuestions: parseInt(row.total_questions_count || 0, 10),
            submissionsToday: parseInt(row.submissions_today_count || 0, 10),
            totalShifts: parseInt(row.total_shifts_count || 0, 10),
        });
    } catch (err) {
        console.error('GET /admin/dashboard-stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/disqualification-log - List recent disqualifications
router.get('/disqualification-log', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM disqualification_log ORDER BY reported_at DESC LIMIT 100`
        );
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        console.error('GET /admin/disqualification-log error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/sessions/:sessionId/reopen - Admin force-resume a candidate session
router.post('/sessions/:sessionId/reopen', async (req, res) => {
    const { sessionId } = req.params;

    try {
        const sessRes = await pool.query(
            `SELECT cs.*, s.is_active AS shift_active, s.ended_at AS shift_ended_at, c.token
             FROM candidate_sessions cs
             JOIN shifts s ON s.id = cs.shift_id
             JOIN candidates c ON c.id = cs.candidate_id
             WHERE cs.id = $1`,
            [sessionId]
        );

        if (sessRes.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessRes.rows[0];

        if (session.shift_ended_at) {
            return res.status(400).json({
                error: 'Cannot reopen session: the shift has already ended.',
            });
        }

        const now = new Date();
        // Determine remaining time: saved snapshot, or time until original end_time, or fallback 15 min
        let remainingSec = session.time_remaining_sec;
        if (!remainingSec || remainingSec <= 0) {
            const diffSec = Math.floor((new Date(session.end_time).getTime() - now.getTime()) / 1000);
            remainingSec = diffSec > 0 ? diffSec : 15 * 60; // 15 min grace if negative
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updatedRes = await client.query(
                `UPDATE candidate_sessions
                 SET admin_reopened = true,
                     admin_reopen_at = $1,
                     is_submitted = false,
                     submitted_at = NULL,
                     time_remaining_sec = $2,
                     end_time = $1 + ($2 || ' seconds')::interval
                 WHERE id = $3
                 RETURNING *`,
                [now, remainingSec, sessionId]
            );

            // If there was an existing result row for accidental submit, delete it
            await client.query(
                `DELETE FROM results WHERE candidate_id = $1 AND shift_id = $2`,
                [session.candidate_id, session.shift_id]
            );

            await client.query('COMMIT');

            const updatedSession = updatedRes.rows[0];

            // Broadcast session_reopened event
            const io = req.app.get('io');
            const userSockets = req.app.get('userSockets');
            const candidateSocketId = userSockets?.get(String(session.candidate_id)) || session.socket_id;

            if (io && candidateSocketId) {
                io.to(candidateSocketId).emit('session_reopened', {
                    sessionId: parseInt(sessionId, 10),
                    newEndTime: updatedSession.end_time,
                    timeRemainingSec: remainingSec,
                });
            }

            res.json({
                success: true,
                message: 'Session reopened successfully.',
                session: updatedSession,
                timeRemainingSec: remainingSec,
                newEndTime: updatedSession.end_time,
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('POST /admin/sessions/:sessionId/reopen error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
