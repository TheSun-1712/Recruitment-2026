const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeAdmin);

// Helper to generate candidate token
function generateToken(branch, section, rollNo) {
    const cleanBranch = (branch || 'GEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanSection = (section || 'A').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanRoll = (rollNo || '0000').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const last4 = cleanRoll.length >= 4 ? cleanRoll.slice(-4) : cleanRoll.padStart(4, '0');
    const crypto6 = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `${cleanBranch}-${cleanSection}-${last4}-${crypto6}`;
}

// GET /admin/candidates - Paginated candidate list with filters and search
router.get('/', async (req, res) => {
    const {
        shift_id,
        branch,
        section,
        search,
        token_used,
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
            conditions.push(`c.shift_id = $${params.length}`);
        }
        if (branch) {
            params.push(branch.trim());
            conditions.push(`c.branch ILIKE $${params.length}`);
        }
        if (section) {
            params.push(section.trim());
            conditions.push(`c.section ILIKE $${params.length}`);
        }
        if (token_used !== undefined) {
            params.push(token_used === 'true');
            conditions.push(`c.token_used = $${params.length}`);
        }
        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            conditions.push(
                `(c.name ILIKE $${params.length} OR c.roll_no ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.token ILIKE $${params.length})`
            );
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count total matching candidates
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM candidates c ${whereClause}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        // Fetch paginated rows with shift name & session status
        params.push(limitNum, offset);
        const dataRes = await pool.query(
            `SELECT 
                c.*,
                s.name AS shift_name,
                cs.id AS session_id,
                cs.is_submitted,
                cs.score,
                cs.active_seconds,
                cs.tab_is_active
             FROM candidates c
             LEFT JOIN shifts s ON s.id = c.shift_id
             LEFT JOIN candidate_sessions cs ON cs.candidate_id = c.id
             ${whereClause}
             ORDER BY c.id DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({
            candidates: dataRes.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error('GET /admin/candidates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/candidates - Spot registration & token generation
router.post('/', async (req, res) => {
    const { name, roll_no, branch, section, email, shift_id } = req.body;

    if (!name || !roll_no || !branch || !section || !email || !shift_id) {
        return res.status(400).json({
            error: 'All fields are required: name, roll_no, branch, section, email, shift_id',
        });
    }

    const cleanRoll = roll_no.trim();

    try {
        // Validate roll number uniqueness
        const rollCheck = await pool.query(
            'SELECT id FROM candidates WHERE roll_no = $1',
            [cleanRoll]
        );
        if (rollCheck.rows.length > 0) {
            return res.status(409).json({ error: `Roll number '${cleanRoll}' is already registered.` });
        }

        // Validate shift exists
        const shiftCheck = await pool.query('SELECT id, name FROM shifts WHERE id = $1', [shift_id]);
        if (shiftCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Selected shift does not exist.' });
        }

        // Generate token and handle rare collision with retry
        let token = generateToken(branch, section, cleanRoll);
        let inserted = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const insertRes = await pool.query(
                    `INSERT INTO candidates 
                        (name, roll_no, branch, section, email, token, shift_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [
                        name.trim(),
                        cleanRoll,
                        branch.trim().toUpperCase(),
                        section.trim().toUpperCase(),
                        email.trim().toLowerCase(),
                        token,
                        shift_id,
                    ]
                );
                inserted = insertRes.rows[0];
                break;
            } catch (insertErr) {
                if (insertErr.code === '23505' && insertErr.constraint === 'candidates_token_key') {
                    token = generateToken(branch, section, cleanRoll); // generate new token on collision
                } else {
                    throw insertErr;
                }
            }
        }

        if (!inserted) {
            return res.status(500).json({ error: 'Failed to generate a unique token after multiple retries.' });
        }

        res.status(201).json({
            success: true,
            candidate: {
                ...inserted,
                shift_name: shiftCheck.rows[0].name,
            },
        });
    } catch (err) {
        console.error('POST /admin/candidates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /admin/candidates/:id - Update candidate info
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, roll_no, branch, section, email, shift_id } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM candidates WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        const candidate = existing.rows[0];

        // If shift is being changed and token has already been used, reject
        if (shift_id !== undefined && parseInt(shift_id, 10) !== candidate.shift_id) {
            if (candidate.token_used) {
                return res.status(400).json({
                    error: 'Cannot change shift for a candidate who has already joined or used their token.',
                });
            }
        }

        // If roll_no is being changed, check uniqueness
        if (roll_no && roll_no.trim() !== candidate.roll_no) {
            const rollCheck = await pool.query(
                'SELECT id FROM candidates WHERE roll_no = $1 AND id != $2',
                [roll_no.trim(), id]
            );
            if (rollCheck.rows.length > 0) {
                return res.status(409).json({ error: `Roll number '${roll_no.trim()}' is already in use.` });
            }
        }

        const updated = await pool.query(
            `UPDATE candidates
             SET name = COALESCE($1, name),
                 roll_no = COALESCE($2, roll_no),
                 branch = COALESCE($3, branch),
                 section = COALESCE($4, section),
                 email = COALESCE($5, email),
                 shift_id = COALESCE($6, shift_id)
             WHERE id = $7
             RETURNING *`,
            [
                name ? name.trim() : null,
                roll_no ? roll_no.trim() : null,
                branch ? branch.trim().toUpperCase() : null,
                section ? section.trim().toUpperCase() : null,
                email ? email.trim().toLowerCase() : null,
                shift_id ? parseInt(shift_id, 10) : null,
                id,
            ]
        );

        res.json({ success: true, candidate: updated.rows[0] });
    } catch (err) {
        console.error('PUT /admin/candidates/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /admin/candidates/:id - Soft or hard delete (only if token unused)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await pool.query('SELECT * FROM candidates WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        if (existing.rows[0].token_used) {
            return res.status(400).json({
                error: 'Cannot delete candidate whose token has already been used in an exam.',
            });
        }

        await pool.query('DELETE FROM candidates WHERE id = $1', [id]);
        res.json({ success: true, message: 'Candidate deleted successfully' });
    } catch (err) {
        console.error('DELETE /admin/candidates/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /admin/candidates/bulk - Bulk import candidates
router.post('/bulk', async (req, res) => {
    const { candidates: candidatesList, default_shift_id } = req.body;

    if (!Array.isArray(candidatesList) || candidatesList.length === 0) {
        return res.status(400).json({ error: 'candidates must be a non-empty array' });
    }

    const client = await pool.connect();
    const imported = [];
    const failed = [];

    try {
        await client.query('BEGIN');

        for (let i = 0; i < candidatesList.length; i++) {
            const item = candidatesList[i];
            const name = item.name?.trim();
            const rollNo = item.roll_no?.toString().trim();
            const branch = (item.branch || 'CSE').trim().toUpperCase();
            const section = (item.section || 'A').trim().toUpperCase();
            const email = (item.email || `${rollNo?.toLowerCase()}@exam.lan`).trim().toLowerCase();
            const shiftId = parseInt(item.shift_id || default_shift_id, 10);

            if (!name || !rollNo || !shiftId) {
                failed.push({ index: i, item, error: 'Missing name, roll_no, or shift_id' });
                continue;
            }

            // Check roll_no duplicate in DB
            const check = await client.query('SELECT id FROM candidates WHERE roll_no = $1', [rollNo]);
            if (check.rows.length > 0) {
                failed.push({ index: i, item, error: `Roll number ${rollNo} already exists` });
                continue;
            }

            let token = generateToken(branch, section, rollNo);
            let row = null;

            for (let a = 0; a < 3; a++) {
                try {
                    const ins = await client.query(
                        `INSERT INTO candidates (name, roll_no, branch, section, email, token, shift_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING *`,
                        [name, rollNo, branch, section, email, token, shiftId]
                    );
                    row = ins.rows[0];
                    break;
                } catch (e) {
                    if (e.code === '23505') {
                        token = generateToken(branch, section, rollNo);
                    } else {
                        throw e;
                    }
                }
            }

            if (row) {
                imported.push(row);
            } else {
                failed.push({ index: i, item, error: 'Failed to generate unique token' });
            }
        }

        await client.query('COMMIT');
        res.json({
            success: true,
            totalProcessed: candidatesList.length,
            importedCount: imported.length,
            failedCount: failed.length,
            imported,
            failed,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /admin/candidates/bulk error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
