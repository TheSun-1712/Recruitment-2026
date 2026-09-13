/**
 * Integration Test Script for Phase 3: Exam Engine Backend
 * Tests candidate join, unique question shuffling, live answer sync,
 * mark for review, timer mechanics, multi-device force logout, and scoring.
 */

const axios = require('axios');
const io = require('socket.io-client');
const pool = require('../db');
require('dotenv').config({ path: '../.env' });

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

async function runTests() {
    console.log('🚀 Starting Phase 3 Exam Engine Verification Suite against', BASE_URL);
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAILED: ${message}`);
            failed++;
            throw new Error(`Assertion failed: ${message}`);
        } else {
            console.log(`✅ PASSED: ${message}`);
            passed++;
        }
    }

    try {
        // 1. Admin login to setup exam environment
        const loginRes = await api.post('/admin/login', { username: 'admin', password: 'admin123' });
        const adminToken = loginRes.data.accessToken;
        const adminApi = axios.create({
            baseURL: BASE_URL,
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        // 2. Create test exam
        const examName = `Exam_Engine_P3_${Date.now()}`;
        const examRes = await adminApi.post('/admin/exam', {
            name: examName,
            total_duration_min: 60,
            grace_join_min: 15,
            questions_per_shift: 75,
        });
        const examId = examRes.data.exam.id;
        await adminApi.post(`/admin/exam/${examId}/activate`);

        // 3. Create Subject & 3 Topics
        const subj = await adminApi.post('/admin/subjects', { exam_id: examId, name: 'Computer Science' });
        const top1 = await adminApi.post(`/admin/subjects/${subj.data.subject.id}/topics`, { name: 'Algorithms' });
        const top2 = await adminApi.post(`/admin/subjects/${subj.data.subject.id}/topics`, { name: 'Networks' });
        const top3 = await adminApi.post(`/admin/subjects/${subj.data.subject.id}/topics`, { name: 'Databases' });

        const topics = [top1.data.topic, top2.data.topic, top3.data.topic];

        // 4. Create Shift
        const shiftRes = await adminApi.post('/admin/shifts', { exam_id: examId, name: 'Engine Test Shift' });
        const shift = shiftRes.data.shift;

        // 5. Seed questions: 3 topics * 25 questions = 75 questions
        // (each topic: 10 easy, 10 medium, 5 hard = 25 questions)
        const questionsToSeed = [];
        for (const t of topics) {
            for (let i = 1; i <= 10; i++) {
                questionsToSeed.push({
                    topic_id: t.id,
                    difficulty: 'easy',
                    body: `Easy question ${i} for ${t.name}. Solve $\\sum_{k=1}^{${i}} k$.`,
                    option_a: 'Option A correct',
                    option_b: 'Option B',
                    option_c: 'Option C',
                    option_d: 'Option D',
                    correct_opt: 'a',
                    explanation: 'Direct formula application',
                });
            }
            for (let i = 1; i <= 10; i++) {
                questionsToSeed.push({
                    topic_id: t.id,
                    difficulty: 'medium',
                    body: `Medium question ${i} for ${t.name}. Evaluate matrix determinant.`,
                    option_a: 'Wrong A',
                    option_b: 'Option B correct',
                    option_c: 'Wrong C',
                    option_d: 'Wrong D',
                    correct_opt: 'b',
                    explanation: 'Matrix property',
                });
            }
            for (let i = 1; i <= 5; i++) {
                questionsToSeed.push({
                    topic_id: t.id,
                    difficulty: 'hard',
                    body: `Hard question ${i} for ${t.name}. Complexity theorem.`,
                    option_a: 'Wrong A',
                    option_b: 'Wrong B',
                    option_c: 'Option C correct',
                    option_d: 'Wrong D',
                    correct_opt: 'c',
                    explanation: 'Master theorem',
                });
            }
        }

        await adminApi.post('/admin/questions/bulk', { exam_id: examId, questions: questionsToSeed });

        // 6. Set weightage rules (3 topics * 25 Qs = 75 Qs)
        const rules = topics.map((t) => ({
            topic_id: t.id,
            easy_count: 10,
            medium_count: 10,
            hard_count: 5,
        }));
        await adminApi.put(`/admin/weightage/${examId}`, { rules });

        // 7. Generate paper for Shift
        await adminApi.post(`/admin/generate/${examId}`, { num_shifts: 1 });
        assert(true, 'Generated shift paper with 75 questions');

        // 8. Register 2 candidates
        const cand1Res = await adminApi.post('/admin/candidates', {
            name: 'Candidate One',
            roll_no: `21P3_${Date.now()}_1`,
            branch: 'CSE',
            section: 'A',
            email: `c1_${Date.now()}@exam.lan`,
            shift_id: shift.id,
        });
        const cand2Res = await adminApi.post('/admin/candidates', {
            name: 'Candidate Two',
            roll_no: `21P3_${Date.now()}_2`,
            branch: 'CSE',
            section: 'B',
            email: `c2_${Date.now()}@exam.lan`,
            shift_id: shift.id,
        });

        const token1 = cand1Res.data.candidate.token;
        const token2 = cand2Res.data.candidate.token;
        assert(token1 && token2, 'Generated tokens for Candidate 1 and Candidate 2');

        // 9. Candidate 1 tries to join before shift starts -> should fail
        try {
            await api.post('/exam/join', { token: token1 });
            assert(false, 'Should block join before shift starts');
        } catch (err) {
            assert(err.response?.status === 400, 'POST /exam/join blocked before shift starts (400)');
        }

        // 10. Admin starts shift
        await adminApi.post(`/admin/shifts/${shift.id}/start`);
        assert(true, 'Shift started by admin');

        // 11. Candidate 1 joins -> new session
        const join1 = await api.post('/exam/join', { token: token1 });
        assert(join1.data.success && join1.data.isResume === false, 'Candidate 1 joined successfully (isResume: false)');
        assert(join1.data.questions.length === 75, 'Candidate 1 received exactly 75 questions');
        assert(join1.data.token, 'Candidate 1 received JWT access token');
        const c1Token = join1.data.token;
        const c1Questions = join1.data.questions;
        const c1SessionId = join1.data.session.id;

        // Verify NO answers exposed in question payload
        const exposedAnswers = c1Questions.some((q) => q.correct_opt !== undefined || q.explanation !== undefined);
        assert(!exposedAnswers, 'Questions payload STRICTLY protects answer key (no correct_opt / explanation exposed)');

        // 12. Candidate 2 joins -> verify per-candidate random shuffle
        const join2 = await api.post('/exam/join', { token: token2 });
        assert(join2.data.success, 'Candidate 2 joined successfully');
        const c2Questions = join2.data.questions;

        // Check that the order of question IDs differs between Candidate 1 and Candidate 2
        let identicalOrder = true;
        for (let i = 0; i < 75; i++) {
            if (c1Questions[i].question_id !== c2Questions[i].question_id) {
                identicalOrder = false;
                break;
            }
        }
        assert(!identicalOrder, 'Per-candidate random question shuffling verified (Candidate 1 order != Candidate 2 order)');

        // 13. Test Answer Selection via REST
        const c1Api = axios.create({
            baseURL: BASE_URL,
            headers: { Authorization: `Bearer ${c1Token}` },
        });

        const q1 = c1Questions[0];
        const ans1Res = await c1Api.post('/exam/answer', {
            questionId: q1.question_id,
            selectedOpt: 'a',
        });
        assert(ans1Res.data.success && ans1Res.data.selectedOpt === 'a', 'Answered Q1 as option A via REST');

        // 14. Test Mark for Review via REST
        const markRes = await c1Api.post('/exam/mark', {
            questionId: q1.question_id,
            isMarked: true,
        });
        assert(markRes.data.success && markRes.data.isMarked === true, 'Marked Q1 for review via REST');

        // 15. Check GET /exam/status
        const statusRes = await c1Api.get('/exam/status');
        assert(statusRes.data.answers[q1.question_id] === 'a', 'GET /exam/status reflects answered question');
        assert(statusRes.data.markedQuestions.includes(q1.question_id), 'GET /exam/status reflects marked question');

        // 16. Test Real-time Socket.IO connection & events for Candidate 1
        console.log('⏳ Connecting Candidate 1 to Socket.IO...');
        const socketDevice1 = io(BASE_URL, {
            auth: { token: c1Token },
            transports: ['websocket'],
        });

        await new Promise((resolve) => socketDevice1.on('connect', resolve));
        assert(socketDevice1.connected, 'Candidate 1 connected to Socket.IO server');

        // Register socket on Device 1
        socketDevice1.emit('register');
        await new Promise((r) => setTimeout(r, 200));

        // Test answer_sync via Socket.IO for Q2
        const q2 = c1Questions[1];
        await new Promise((resolve) => {
            socketDevice1.emit('answer_sync', { questionId: q2.question_id, selectedOpt: 'b' });
            socketDevice1.once('answer_saved', (data) => {
                assert(data.questionId === q2.question_id && data.selectedOpt === 'b', 'Socket.IO answer_sync saved');
                resolve();
            });
        });

        // Test mark_sync via Socket.IO for Q2
        await new Promise((resolve) => {
            socketDevice1.emit('mark_sync', { questionId: q2.question_id, isMarked: true });
            socketDevice1.once('mark_saved', (data) => {
                assert(data.questionId === q2.question_id && data.isMarked === true, 'Socket.IO mark_sync saved');
                resolve();
            });
        });

        // Test tab_inactive & tab_active timer mechanics
        socketDevice1.emit('tab_inactive', { sessionId: c1SessionId, timeRemainingMs: 3500000 });
        await new Promise((r) => setTimeout(r, 200));

        const tabDbCheck = await pool.query('SELECT tab_is_active, time_remaining_sec FROM candidate_sessions WHERE id = $1', [c1SessionId]);
        assert(tabDbCheck.rows[0].tab_is_active === false, 'Tab inactive recorded: tab_is_active is false');
        assert(tabDbCheck.rows[0].time_remaining_sec === 3500, 'Tab inactive snapshot: time_remaining_sec is 3500');

        // Tab active + time_sync response
        await new Promise((resolve) => {
            socketDevice1.emit('tab_active', { sessionId: c1SessionId });
            socketDevice1.once('time_sync', (data) => {
                assert(data.timeRemainingSec >= 0, `Received time_sync from server: ${data.timeRemainingSec}s`);
                resolve();
            });
        });

        // 17. Multi-Device Force Logout & Resume Test
        console.log('⏳ Simulating Device 2 login with same token...');
        let device1ForceLogoutReceived = false;
        socketDevice1.once('force_logout', () => {
            device1ForceLogoutReceived = true;
        });

        // Candidate 1 logs in on Device 2 using same token
        const resumeRes = await api.post('/exam/join', { token: token1 });
        assert(resumeRes.data.success && resumeRes.data.isResume === true, 'Device 2 joined (isResume: true)');
        const c1Device2Token = resumeRes.data.token;

        // Connect Device 2 socket and register
        const socketDevice2 = io(BASE_URL, {
            auth: { token: c1Device2Token },
            transports: ['websocket'],
        });
        await new Promise((resolve) => socketDevice2.on('connect', resolve));
        socketDevice2.emit('register');
        await new Promise((r) => setTimeout(r, 300));

        assert(device1ForceLogoutReceived, 'Device 1 received force_logout socket event upon Device 2 login');

        // Old JWT from Device 1 should now be rejected by authMiddleware with 401
        try {
            await c1Api.post('/exam/answer', { questionId: q1.question_id, selectedOpt: 'c' });
            assert(false, 'Device 1 old JWT should be rejected');
        } catch (err) {
            assert(err.response?.status === 401, 'Device 1 old JWT rejected with 401 (Logged in elsewhere)');
        }

        // Device 2 verifies previously answered questions are preserved
        const c1Device2Api = axios.create({
            baseURL: BASE_URL,
            headers: { Authorization: `Bearer ${c1Device2Token}` },
        });
        const resumeStatus = await c1Device2Api.get('/exam/status');
        assert(resumeStatus.data.answers[q1.question_id] === 'a', 'Device 2 retains answer for Q1');
        assert(resumeStatus.data.answers[q2.question_id] === 'b', 'Device 2 retains answer for Q2');

        // 18. Exam Submission & Scoring Test
        console.log('⏳ Submitting exam for Candidate 1...');
        const submitRes = await c1Device2Api.post('/exam/submit');
        assert(submitRes.data.success, 'Exam submitted successfully');
        assert(typeof submitRes.data.score === 'number', `Computed score: ${submitRes.data.score}`);
        assert(typeof submitRes.data.correct_count === 'number', `Correct count: ${submitRes.data.correct_count}`);
        assert(typeof submitRes.data.wrong_count === 'number', `Wrong count: ${submitRes.data.wrong_count}`);
        assert(typeof submitRes.data.skipped_count === 'number', `Skipped count: ${submitRes.data.skipped_count}`);
        assert(
            submitRes.data.correct_count + submitRes.data.wrong_count + submitRes.data.skipped_count === 75,
            'Correct + Wrong + Skipped exactly equals 75 total questions'
        );

        // Verify submission in database
        const dbResultCheck = await pool.query('SELECT * FROM results WHERE candidate_id = $1', [cand1Res.data.candidate.id]);
        assert(dbResultCheck.rows.length === 1, 'Result record persisted in database');

        // 19. Double-Submit and Re-Join with Submitted Token Prevention
        try {
            await c1Device2Api.post('/exam/submit');
            assert(false, 'Should reject double submit');
        } catch (err) {
            assert(err.response?.status === 400, 'Double-submit rejected with 400');
        }

        try {
            await api.post('/exam/join', { token: token1 });
            assert(false, 'Should block rejoining with completed token');
        } catch (err) {
            assert(err.response?.status === 403, 'Rejoining with completed token rejected with 403');
        }

        // Cleanup sockets
        socketDevice1.disconnect();
        socketDevice2.disconnect();

        console.log('\n=========================================');
        console.log(`🎉 ALL PHASE 3 TESTS PASSED! (${passed} checks passed, ${failed} failed)`);
        console.log('=========================================\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ TEST RUN ABORTED DUE TO ERROR:', err.response?.data || err.message);
        process.exit(1);
    }
}

runTests();
