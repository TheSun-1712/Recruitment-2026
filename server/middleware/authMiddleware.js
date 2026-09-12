const jwt = require('jsonwebtoken');
const pool = require('../db');

/**
 * Verifies the JWT from the Authorization header.
 * Also checks session_version in the candidates table in DB.
 * If the candidate re-joined on another device (new JWT with bumped version),
 * all older JWTs for that candidate are automatically rejected (401).
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return res.status(401).json({ error: msg });
    }

    // Session version check — only applies to candidate tokens (not admin tokens)
    // Admin JWTs have adminId/role='admin'
    if (decoded.role !== 'admin') {
        const candidateId = decoded.candidateId;
        if (!candidateId) {
            return res.status(401).json({ error: 'Invalid token structure' });
        }
        try {
            const result = await pool.query(
                'SELECT session_version FROM candidates WHERE id = $1',
                [candidateId]
            );
            if (!result.rows[0] || result.rows[0].session_version !== decoded.sessionVersion) {
                return res.status(401).json({ error: 'Logged in elsewhere. Please rejoin.' });
            }
        } catch (err) {
            console.error('Auth DB check failed:', err.message);
            return res.status(500).json({ error: 'Authentication failed' });
        }
    }

    req.user = decoded; // { candidateId, shiftId, sessionVersion, role, ... }
    next();
}

/**
 * Checks that the authenticated user has the 'admin' role.
 * Must be used AFTER authenticateToken.
 */
function authorizeAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

/**
 * Authenticates internal server-to-server calls if configured.
 */
function authenticateInternal(req, res, next) {
    if (!process.env.INTERNAL_SECRET || req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = { userId: parseInt(req.headers['x-user-id'], 10) };
    next();
}

module.exports = { authenticateToken, authorizeAdmin, authenticateInternal };
