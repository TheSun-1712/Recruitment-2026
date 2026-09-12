const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const pool = require('../db');
const supabase = require('../db/supabase');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// GET /admin/results/export.csv - Download CSV export of all results
// Placed BEFORE /:candidateId to prevent shadowing
router.get('/export.csv', async (req, res) => {
    const { shift_id, branch, section } = req.query;

    try {
        const conditions = [];
        const params = [];

        if (shift_id) {
            params.push(parseInt(shift_id, 10));
            conditions.push(`r.shift_id = $${params.length}`);
        }
        if (branch) {
            params.push(branch.trim());
            conditions.push(`c.branch ILIKE $${params.length}`);
        }
        if (section) {
            params.push(section.trim());
            conditions.push(`c.section ILIKE $${params.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT 
                ROW_NUMBER() OVER (ORDER BY r.score DESC, r.time_taken_sec ASC, r.submitted_at ASC) AS "Rank",
                c.name AS "Name",
                c.roll_no AS "Roll No",
                c.branch AS "Branch",
                c.section AS "Section",
                c.email AS "Email",
                s.name AS "Shift",
                r.score AS "Score",
                r.total_questions AS "Total Questions",
                r.correct_count AS "Correct",
                r.wrong_count AS "Wrong",
                r.skipped_count AS "Skipped",
                r.time_taken_sec AS "Time Taken (sec)",
                TO_CHAR(r.submitted_at, 'YYYY-MM-DD HH24:MI:SS') AS "Submitted At"
             FROM results r
             JOIN candidates c ON c.id = r.candidate_id
             JOIN shifts s ON s.id = r.shift_id
             ${whereClause}
             ORDER BY r.score DESC, r.time_taken_sec ASC, r.submitted_at ASC`,
            params
        );

        const fields = [
            'Rank',
            'Name',
            'Roll No',
            'Branch',
            'Section',
            'Email',
            'Shift',
            'Score',
            'Total Questions',
            'Correct',
            'Wrong',
            'Skipped',
            'Time Taken (sec)',
            'Submitted At',
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.attachment(`mcq_exam_results_${Date.now()}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('GET /admin/results/export.csv error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/results/shift/:shiftId/summary - Aggregate shift stats
// Placed BEFORE /:candidateId to prevent shadowing
router.get('/shift/:shiftId/summary', async (req, res) => {
    const { shiftId } = req.params;

    try {
        const statsRes = await pool.query(
            `SELECT 
                COUNT(r.id) AS submission_count,
                COALESCE(ROUND(AVG(r.score), 2), 0) AS mean_score,
                COALESCE(MAX(r.score), 0) AS highest_score,
                COALESCE(MIN(r.score), 0) AS lowest_score,
                COALESCE(ROUND(AVG(r.time_taken_sec), 0), 0) AS avg_time_sec,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.score) AS median_score
             FROM results r
             WHERE r.shift_id = $1`,
            [shiftId]
        );

        const shiftRes = await pool.query('SELECT id, name FROM shifts WHERE id = $1', [shiftId]);

        res.json({
            shift: shiftRes.rows[0] || null,
            stats: statsRes.rows[0],
        });
    } catch (err) {
        console.error('GET /admin/results/shift/:shiftId/summary error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/results/sync - Post-exam push to Supabase
// Placed BEFORE /:candidateId to prevent shadowing
router.post('/sync', async (req, res) => {
    if (!supabase) {
        return res.status(503).json({
            error: 'Supabase cloud client is not configured. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in server/.env.',
        });
    }

    try {
        // Fetch unsynced results with candidate details
        const unsyncedRes = await pool.query(
            `SELECT 
                r.id AS local_result_id,
                r.candidate_id,
                r.shift_id,
                r.score,
                r.total_questions,
                r.correct_count,
                r.wrong_count,
                r.skipped_count,
                r.time_taken_sec,
                r.submitted_at,
                c.roll_no,
                c.name AS candidate_name,
                c.branch,
                c.section,
                c.email,
                s.name AS shift_name
             FROM results r
             JOIN candidates c ON c.id = r.candidate_id
             JOIN shifts s ON s.id = r.shift_id
             WHERE r.synced_to_cloud = false
             ORDER BY r.id ASC
             LIMIT 500`
        );

        if (unsyncedRes.rows.length === 0) {
            return res.json({ success: true, message: 'All results are already synced to cloud.', synced: 0, failed: 0 });
        }

        const rowsToSync = unsyncedRes.rows;
        const payload = rowsToSync.map((r) => ({
            roll_no: r.roll_no,
            candidate_name: r.candidate_name,
            branch: r.branch,
            section: r.section,
            email: r.email,
            shift_id: r.shift_id,
            shift_name: r.shift_name,
            score: r.score,
            total_questions: r.total_questions,
            correct_count: r.correct_count,
            wrong_count: r.wrong_count,
            skipped_count: r.skipped_count,
            time_taken_sec: r.time_taken_sec,
            submitted_at: r.submitted_at,
        }));

        // Upsert to Supabase
        const { data, error } = await supabase
            .from('results')
            .upsert(payload, { onConflict: 'roll_no,shift_id', ignoreDuplicates: false });

        if (error) {
            console.error('Supabase sync error:', error);
            return res.status(502).json({ error: error.message, failed: rowsToSync.length, synced: 0 });
        }

        // Mark local rows as synced
        const localIds = rowsToSync.map((r) => r.local_result_id);
        await pool.query(
            `UPDATE results SET synced_to_cloud = true WHERE id = ANY($1::int[])`,
            [localIds]
        );

        res.json({
            success: true,
            synced: rowsToSync.length,
            failed: 0,
            message: `Successfully synced ${rowsToSync.length} result(s) to Supabase cloud.`,
        });
    } catch (err) {
        console.error('POST /admin/results/sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/results - Query all results with filters
router.get('/', async (req, res) => {
    const {
        shift_id,
        branch,
        section,
        search,
        synced_to_cloud,
        page = 1,
        limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    try {
        const conditions = [];
        const params = [];

        if (shift_id) {
            params.push(parseInt(shift_id, 10));
            conditions.push(`r.shift_id = $${params.length}`);
        }
        if (branch) {
            params.push(branch.trim());
            conditions.push(`c.branch ILIKE $${params.length}`);
        }
        if (section) {
            params.push(section.trim());
            conditions.push(`c.section ILIKE $${params.length}`);
        }
        if (synced_to_cloud !== undefined) {
            params.push(synced_to_cloud === 'true');
            conditions.push(`r.synced_to_cloud = $${params.length}`);
        }
        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            conditions.push(`(c.name ILIKE $${params.length} OR c.roll_no ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countRes = await pool.query(
            `SELECT COUNT(r.id) 
             FROM results r 
             JOIN candidates c ON c.id = r.candidate_id 
             ${whereClause}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        params.push(limitNum, offset);
        const dataRes = await pool.query(
            `SELECT 
                r.*,
                c.name AS candidate_name,
                c.roll_no,
                c.branch,
                c.section,
                c.email,
                s.name AS shift_name,
                ROW_NUMBER() OVER (ORDER BY r.score DESC, r.time_taken_sec ASC, r.submitted_at ASC) AS rank
             FROM results r
             JOIN candidates c ON c.id = r.candidate_id
             JOIN shifts s ON s.id = r.shift_id
             ${whereClause}
             ORDER BY r.score DESC, r.time_taken_sec ASC, r.submitted_at ASC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({
            results: dataRes.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error('GET /admin/results error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /admin/results/:candidateId - Per-question answer breakdown
router.get('/:candidateId', async (req, res) => {
    const { candidateId } = req.params;

    try {
        const candidateRes = await pool.query(
            `SELECT c.*, s.name AS shift_name, r.score, r.submitted_at, r.time_taken_sec
             FROM candidates c
             LEFT JOIN shifts s ON s.id = c.shift_id
             LEFT JOIN results r ON r.candidate_id = c.id
             WHERE c.id = $1`,
            [candidateId]
        );

        if (candidateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        const questionsRes = await pool.query(
            `SELECT 
                cq.position,
                cq.selected_opt,
                cq.is_marked,
                cq.answered_at,
                q.id AS question_id,
                q.body,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_opt,
                q.explanation,
                q.image_url,
                q.difficulty,
                t.name AS topic_name,
                s.name AS subject_name,
                (cq.selected_opt = q.correct_opt) AS is_correct
             FROM candidate_questions cq
             JOIN questions q ON q.id = cq.question_id
             JOIN topics t ON t.id = q.topic_id
             JOIN subjects s ON s.id = t.subject_id
             WHERE cq.candidate_id = $1
             ORDER BY cq.position ASC`,
            [candidateId]
        );

        res.json({
            candidate: candidateRes.rows[0],
            breakdown: questionsRes.rows,
        });
    } catch (err) {
        console.error('GET /admin/results/:candidateId error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
