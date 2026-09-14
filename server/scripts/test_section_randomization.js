const axios = require('axios');
const pool = require('../db');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3000';

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        process.exit(1);
    }
    console.log(`✅ ${message}`);
}

function getSubjectBlocks(questions) {
    const blocks = [];
    let currentSubj = null;
    for (const q of questions) {
        if (q.subject_name !== currentSubj) {
            currentSubj = q.subject_name;
            blocks.push(currentSubj);
        }
    }
    return blocks;
}

async function runTest() {
    console.log('🧪 Starting Section-Wise Randomization Verification...\n');

    // 1. Pick a shift with generated paper
    const shiftRes = await pool.query(
        `SELECT s.id, s.name, COUNT(sq.question_id) AS q_count
         FROM shifts s
         JOIN shift_questions sq ON sq.shift_id = s.id
         GROUP BY s.id, s.name
         HAVING COUNT(sq.question_id) > 0
         ORDER BY s.id ASC LIMIT 1`
    );

    assert(shiftRes.rows.length > 0, 'Found shift with generated paper');
    const shift = shiftRes.rows[0];
    const totalShiftQuestions = parseInt(shift.q_count, 10);
    console.log(`Using Shift: '${shift.name}' (ID: ${shift.id}) with ${totalShiftQuestions} questions.`);

    // Ensure shift is marked active and started so join succeeds
    await pool.query(
        `UPDATE shifts SET is_active = true, started_at = NOW(), ended_at = NULL, is_paused = false WHERE id = $1`,
        [shift.id]
    );

    // Create 3 temporary test candidates
    const tokens = [];
    const candidateIds = [];

    for (let i = 1; i <= 3; i++) {
        const rollNo = `TEST-SECT-${Date.now()}-${i}`;
        const token = `TEST-SEC-${i}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const candRes = await pool.query(
            `INSERT INTO candidates (name, roll_no, branch, section, email, token, shift_id)
             VALUES ($1, $2, 'CSE', 'A', $3, $4, $5)
             RETURNING id, token`,
            [`Test Candidate ${i}`, rollNo, `test_${rollNo}@example.com`, token, shift.id]
        );
        candidateIds.push(candRes.rows[0].id);
        tokens.push(candRes.rows[0].token);
    }

    try {
        const joinResponses = [];
        for (let i = 0; i < tokens.length; i++) {
            const res = await axios.post(`${BASE_URL}/exam/join`, { token: tokens[i] });
            assert(res.status === 200, `Candidate ${i + 1} joined successfully`);
            assert(res.data.isResume === false, `Candidate ${i + 1} is initial join (isResume: false)`);
            assert(res.data.questions.length === totalShiftQuestions, `Candidate ${i + 1} received all ${totalShiftQuestions} questions`);
            joinResponses.push(res.data);
        }

        // Verify contiguous subject grouping for all candidates
        for (let i = 0; i < joinResponses.length; i++) {
            const questions = joinResponses[i].questions;
            const blocks = getSubjectBlocks(questions);
            const uniqueSubjects = new Set(questions.map((q) => q.subject_name));

            console.log(`\nCandidate ${i + 1} Section Sequence: ${blocks.join(' -> ')}`);
            
            // If questions are contiguous, number of blocks MUST equal number of unique subjects
            assert(
                blocks.length === uniqueSubjects.size,
                `Candidate ${i + 1} questions are strictly contiguous by subject (Blocks: ${blocks.length}, Unique subjects: ${uniqueSubjects.size})`
            );

            // Verify positions are 1..N
            const positions = questions.map((q) => q.position);
            const expectedPositions = Array.from({ length: totalShiftQuestions }, (_, idx) => idx + 1);
            assert(
                JSON.stringify(positions) === JSON.stringify(expectedPositions),
                `Candidate ${i + 1} positions are strictly sequential 1..${totalShiftQuestions}`
            );
        }

        // Verify that question ordering within subjects is randomized between candidates
        const c1Questions = joinResponses[0].questions;
        const c2Questions = joinResponses[1].questions;
        const c3Questions = joinResponses[2].questions;

        const c1Ids = c1Questions.map((q) => q.question_id);
        const c2Ids = c2Questions.map((q) => q.question_id);
        const c3Ids = c3Questions.map((q) => q.question_id);

        assert(
            JSON.stringify(c1Ids) !== JSON.stringify(c2Ids) || JSON.stringify(c1Ids) !== JSON.stringify(c3Ids),
            'Question order varies across candidates'
        );

        // Verify Resume preserves the exact same section order and positions
        const resumeRes = await axios.post(`${BASE_URL}/exam/join`, { token: tokens[0] });
        assert(resumeRes.data.isResume === true, 'Candidate 1 successfully resumes session');
        const resumedIds = resumeRes.data.questions.map((q) => q.question_id);
        assert(
            JSON.stringify(resumedIds) === JSON.stringify(c1Ids),
            'Candidate 1 resume returns the exact same section-wise question order and positions'
        );

        console.log('\n🎉 ALL SECTION-WISE RANDOMIZATION TESTS PASSED SUCCESSFULLY!\n');
    } finally {
        // Cleanup test candidates
        for (const cid of candidateIds) {
            await pool.query('DELETE FROM results WHERE candidate_id = $1', [cid]);
            await pool.query('DELETE FROM candidate_questions WHERE candidate_id = $1', [cid]);
            await pool.query('DELETE FROM candidate_sessions WHERE candidate_id = $1', [cid]);
            await pool.query('DELETE FROM candidates WHERE id = $1', [cid]);
        }
        await pool.end();
    }
}

runTest().catch((err) => {
    console.error('Test execution failed:', err.response?.data || err.message);
    process.exit(1);
});
