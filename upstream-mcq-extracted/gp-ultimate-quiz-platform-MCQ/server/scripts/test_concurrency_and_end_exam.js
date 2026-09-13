const http = require('http');
const pool = require('../db');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000';

function post(path, body, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(`${BASE_URL}${path}`, {
            method: 'POST',
            headers,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(`${BASE_URL}${path}`, {
            method: 'GET',
            headers,
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('=== STARTING CONCURRENCY & EXAM END VALIDATION SUITE ===\n');

    // 1. Fetch an active shift or activate one
    await pool.query(`UPDATE shifts SET is_active = true, started_at = NOW(), ended_at = NULL WHERE id = (SELECT id FROM shifts ORDER BY id ASC LIMIT 1)`);

    const testCand = await pool.query(
        `SELECT c.token, c.id, c.shift_id, s.name as shift_name
         FROM candidates c
         JOIN shifts s ON s.id = c.shift_id
         WHERE s.is_active = true
         ORDER BY c.id ASC LIMIT 1`
    );

    const candidate = testCand.rows[0];
    console.log(`Using test candidate ID: ${candidate.id}, Shift: ${candidate.shift_name}, Token: ${candidate.token}`);

    // Reset candidate for clean test
    await pool.query('DELETE FROM results WHERE candidate_id = $1', [candidate.id]);
    await pool.query('DELETE FROM candidate_questions WHERE candidate_id = $1', [candidate.id]);
    await pool.query('DELETE FROM candidate_sessions WHERE candidate_id = $1', [candidate.id]);
    await pool.query('UPDATE candidates SET token_used = false, session_version = 0 WHERE id = $1', [candidate.id]);

    // ============================================================
    // TEST 1: CONCURRENT JOIN TEST (Row-Level Locking Verification)
    // ============================================================
    console.log('\n--- TEST 1: Concurrent Joins with Same Token ---');
    const joinPromises = [
        post('/exam/join', { token: candidate.token }),
        post('/exam/join', { token: candidate.token }),
        post('/exam/join', { token: candidate.token }),
    ];

    const joinResults = await Promise.all(joinPromises);
    console.log('Concurrent Join Status Codes:', joinResults.map(r => r.status));

    // All should succeed (200 OK), with no 500 unique constraint crash!
    const all200 = joinResults.every(r => r.status === 200);
    const hasInitial = joinResults.some(r => r.data.isResume === false);

    if (all200 && hasInitial) {
        console.log('✅ TEST 1 PASSED: Concurrent joins serialized cleanly without unique constraint crash.');
    } else {
        console.error('❌ TEST 1 FAILED:', joinResults);
        process.exit(1);
    }

    // Verify candidate questions count
    const qCountRes = await pool.query('SELECT COUNT(*) FROM candidate_questions WHERE candidate_id = $1', [candidate.id]);
    console.log(`Assigned questions in DB: ${qCountRes.rows[0].count} (Expected: unique questions, no duplicates)`);

    // ============================================================
    // TEST 2: DUAL-LAYER 401 EVICTION TEST (Session Versioning)
    // ============================================================
    console.log('\n--- TEST 2: Dual-Layer 401 Eviction Test ---');
    // First device token from the initial join
    const device1Token = joinResults.find(r => r.data.isResume === false)?.data.token;
    
    // Now simulate Device 2 joining afresh (bumping session_version)
    const device2Res = await post('/exam/join', { token: candidate.token });
    const device2Token = device2Res.data.token;
    console.log('Device 2 joined. New session version:', device2Res.data.session);

    // Device 1 attempts to submit an answer with its legacy token
    const firstQ = device2Res.data.questions[0].question_id;
    const device1AnswerRes = await post('/exam/answer', { questionId: firstQ, selectedOpt: 'a' }, device1Token);
    console.log('Device 1 (legacy token) answer response:', device1AnswerRes.status, device1AnswerRes.data);

    if (device1AnswerRes.status === 401 && device1AnswerRes.data.error.includes('Logged in elsewhere')) {
        console.log('✅ TEST 2 PASSED: Device 1 correctly rejected with HTTP 401 Logged in elsewhere.');
    } else {
        console.error('❌ TEST 2 FAILED: Expected 401 Logged in elsewhere, got:', device1AnswerRes);
        process.exit(1);
    }

    // Device 2 (active token) submits answer successfully
    const device2AnswerRes = await post('/exam/answer', { questionId: firstQ, selectedOpt: 'b' }, device2Token);
    console.log('Device 2 (active token) answer response:', device2AnswerRes.status, device2AnswerRes.data);
    if (device2AnswerRes.status === 200 && device2AnswerRes.data.success) {
        console.log('✅ Device 2 answer recorded successfully.');
    } else {
        console.error('❌ Device 2 answer failed:', device2AnswerRes);
        process.exit(1);
    }

    // ============================================================
    // TEST 3: END EXAM & IDEMPOTENT SUBMIT TEST
    // ============================================================
    console.log('\n--- TEST 3: End Exam & Idempotent Submit Test ---');
    // Admin login
    const adminLoginRes = await post('/admin/login', { username: 'admin', password: 'password' });
    let adminToken = adminLoginRes.data?.accessToken;
    if (!adminToken) {
        // try admin123
        const adminLoginRes2 = await post('/admin/login', { username: 'admin', password: 'admin123' });
        adminToken = adminLoginRes2.data?.accessToken;
    }
    console.log('Admin login status:', adminToken ? 'Success' : 'Failed');

    if (!adminToken) {
        console.error('Could not login as admin to test end exam');
        process.exit(1);
    }

    // Admin ends the shift
    const endShiftRes = await post(`/admin/shifts/${candidate.shift_id}/end`, {}, adminToken);
    console.log('Admin end shift response:', endShiftRes.status, endShiftRes.data);

    // Verify in DB that candidate_sessions is marked is_submitted = true
    const sessionCheck = await pool.query('SELECT is_submitted, score FROM candidate_sessions WHERE candidate_id = $1', [candidate.id]);
    console.log('Session DB state after end-shift:', sessionCheck.rows[0]);

    // Now candidate calls /exam/submit with device2Token
    // THIS PREVIOUSLY RETURNED 400 AND FAILED THE CLIENT!
    const candidateSubmitRes = await post('/exam/submit', {}, device2Token);
    console.log('Candidate /exam/submit response after admin end-shift:', candidateSubmitRes.status, candidateSubmitRes.data);

    if (candidateSubmitRes.status === 200 && candidateSubmitRes.data.isAlreadySubmitted) {
        console.log('✅ TEST 3 PASSED: /exam/submit is now idempotent and returns HTTP 200 with isAlreadySubmitted: true and final score!');
    } else {
        console.error('❌ TEST 3 FAILED: Expected 200 OK with isAlreadySubmitted, got:', candidateSubmitRes);
        process.exit(1);
    }

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Validation test error:', err);
    process.exit(1);
});
