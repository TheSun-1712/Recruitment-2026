const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// GET /admin/grading/:examId - Get grading config
router.get('/:examId', async (req, res) => {
    const { examId } = req.params;
    try {
        const result = await pool.query(
            'SELECT pass_mark_pct, grade_ranges FROM exam_config WHERE id = $1',
            [examId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
        res.json({ success: true, grading: result.rows[0] });
    } catch (err) {
        console.error('GET /admin/grading error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/grading/:examId - Update grading config
router.put('/:examId', async (req, res) => {
    const { examId } = req.params;
    const { pass_mark_pct, grade_ranges } = req.body;
    try {
        const result = await pool.query(
            `UPDATE exam_config 
             SET pass_mark_pct = $1, grade_ranges = $2 
             WHERE id = $3 RETURNING pass_mark_pct, grade_ranges`,
            [pass_mark_pct, JSON.stringify(grade_ranges), examId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
        res.json({ success: true, grading: result.rows[0] });
    } catch (err) {
        console.error('PUT /admin/grading error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/grading/:examId/apply - Apply grading to existing results
router.post('/:examId/apply', async (req, res) => {
    const { examId } = req.params;
    try {
        const examRes = await pool.query(
            'SELECT pass_mark_pct, grade_ranges FROM exam_config WHERE id = $1',
            [examId]
        );
        if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
        
        const { pass_mark_pct, grade_ranges } = examRes.rows[0];
        
        // Fetch all results for this exam
        const resultsRes = await pool.query(
            `SELECT r.id, r.percentage 
             FROM results r
             JOIN shifts s ON s.id = r.shift_id
             WHERE s.exam_id = $1`,
            [examId]
        );
        
        let updateCount = 0;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const row of resultsRes.rows) {
                const percentage = parseFloat(row.percentage || 0);
                let pass_fail = percentage >= parseFloat(pass_mark_pct) ? 'pass' : 'fail';
                
                let grade = null;
                if (grade_ranges && Array.isArray(grade_ranges)) {
                    for (const range of grade_ranges) {
                        if (percentage >= range.min && percentage <= range.max) {
                            grade = range.label;
                            break;
                        }
                    }
                }
                
                await client.query(
                    `UPDATE results 
                     SET pass_fail = $1, grade = $2
                     WHERE id = $3`,
                    [pass_fail, grade, row.id]
                );
                updateCount++;
            }
            
            await client.query('COMMIT');
            res.json({ success: true, message: `Successfully applied grading to ${updateCount} results.` });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('POST /admin/grading/:examId/apply error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
