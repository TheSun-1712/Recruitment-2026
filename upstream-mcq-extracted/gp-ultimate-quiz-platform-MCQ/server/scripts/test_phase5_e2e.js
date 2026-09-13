const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';
const api = axios.create({ baseURL: BASE_URL });

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    }
    console.log(`✅ PASSED: ${message}`);
}

async function runTest() {
    console.log(`🚀 Starting Phase 5 End-to-End Simulation Test against ${BASE_URL}`);

    // 1. Admin login to setup clean test environment
    const loginRes = await api.post('/admin/login', { username: 'admin', password: 'admin123' });
    const adminToken = loginRes.data.accessToken;
    const adminApi = axios.create({
        baseURL: BASE_URL,
        headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 2. Create isolated test exam
    const examName = `Exam_Phase5_E2E_${Date.now()}`;
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
    const shiftRes = await adminApi.post('/admin/shifts', { exam_id: examId, name: 'Phase 5 E2E Shift' });
    const shift = shiftRes.data.shift;

    // 5. Seed 75 questions (25 per topic)
    const questionsToSeed = [];
    for (const t of topics) {
        for (let i = 1; i <= 10; i++) {
            questionsToSeed.push({
                topic_id: t.id,
                difficulty: 'easy',
                body: `Easy question ${i} for ${t.name}. Calculate $x = ${i}^2$.`,
                option_a: `$x = ${i * i}$`,
                option_b: `$x = ${i * 2}$`,
                option_c: `$x = ${i + 2}$`,
                option_d: `$x = 0$`,
                correct_opt: 'a',
            });
        }
        for (let i = 1; i <= 10; i++) {
            questionsToSeed.push({
                topic_id: t.id,
                difficulty: 'medium',
                body: `Medium question ${i} for ${t.name}. Matrix trace of $I_{${i}}$.`,
                option_a: '0',
                option_b: `${i}`,
                option_c: `${i * 2}`,
                option_d: '-1',
                correct_opt: 'b',
            });
        }
        for (let i = 1; i <= 5; i++) {
            questionsToSeed.push({
                topic_id: t.id,
                difficulty: 'hard',
                body: `Hard question ${i} for ${t.name}. Eigenvalue of nilpotent matrix.`,
                option_a: '0',
                option_b: '1',
                option_c: 'Undefined',
                option_d: 'Infinity',
                correct_opt: 'a',
            });
        }
    }

    await adminApi.post('/admin/questions/bulk', { questions: questionsToSeed });

    // 6. Set weightage & generate paper
    const weightageRules = topics.map((t) => ({
        topic_id: t.id,
        easy_count: 10,
        medium_count: 10,
        hard_count: 5,
    }));
    await adminApi.put(`/admin/weightage/${examId}`, { rules: weightageRules });
    await adminApi.post(`/admin/generate/${examId}`, { num_shifts: 1 });

    // 7. Start Shift
    await adminApi.post(`/admin/shifts/${shift.id}/start`);
    assert(true, 'Exam, questions, weightage, paper, and shift successfully initialized');

    // 8. Register Candidate
    const rollNo = `E2E_${Date.now().toString().slice(-6)}`;
    const regRes = await adminApi.post('/admin/candidates', {
        name: 'Priya Sharma',
        roll_no: rollNo,
        branch: 'CSE',
        section: 'B',
        email: `${rollNo.toLowerCase()}@college.edu`,
        shift_id: shift.id,
    });
    const candidate = regRes.data.candidate;
    assert(Boolean(candidate.token), `Generated candidate token: ${candidate.token}`);

    // 9. Candidate Join Simulation (CandidateLogin)
    const joinRes = await api.post('/exam/join', { token: candidate.token });
    assert(joinRes.status === 200, 'Candidate joined exam successfully');
    assert(joinRes.data.questions.length === 75, 'Candidate received 75 questions');
    assert(Boolean(joinRes.data.token || joinRes.data.jwt), 'Candidate received JWT access token');
    const candToken = joinRes.data.token || joinRes.data.jwt;
    const candHeaders = { headers: { Authorization: `Bearer ${candToken}` } };
    const questions = joinRes.data.questions;

    // Verify security: questions do not expose answer key
    assert(questions[0].correct_opt === undefined, 'Answer key (correct_opt) is strictly omitted');
    assert(questions[0].explanation === undefined, 'Explanation is strictly omitted');

    // 10. Connect to WebSockets
    const socket = io(BASE_URL, { transports: ['websocket'] });
    await new Promise((resolve) => {
        socket.on('connect', () => {
            socket.emit('register', {
                role: 'candidate',
                candidateId: candidate.id,
                shiftId: shift.id,
                sessionId: joinRes.data.sessionId,
                jwt: candToken,
            });
            socket.emit('join_shift_room', { shiftId: shift.id });
            resolve();
        });
    });
    assert(socket.connected, 'Candidate connected via WebSocket');

    // 11. Answer 5 questions
    for (let i = 0; i < 5; i++) {
        const q = questions[i];
        const opt = ['a', 'b', 'c', 'd'][i % 4];
        const ansRes = await api.post('/exam/answer', { questionId: q.question_id, selectedOpt: opt }, candHeaders);
        assert(ansRes.data.success === true, `Answered Q${i + 1} (${q.question_id}) as option ${opt.toUpperCase()}`);
    }

    // 12. Mark 2 questions for review
    const markRes1 = await api.post('/exam/mark', { questionId: questions[0].question_id, isMarked: true }, candHeaders);
    assert(markRes1.data.isMarked === true, `Marked Q1 for review`);
    const markRes2 = await api.post('/exam/mark', { questionId: questions[1].question_id, isMarked: true }, candHeaders);
    assert(markRes2.data.isMarked === true, `Marked Q2 for review`);

    // 13. Verify status
    const statusRes = await api.get('/exam/status', candHeaders);
    assert(statusRes.data.totalAnswered === 5, 'Status reflects 5 answered questions');
    assert(statusRes.data.totalMarked === 2, 'Status reflects 2 marked questions');

    // 14. Submit Exam
    const submitRes = await api.post('/exam/submit', {}, candHeaders);
    assert(submitRes.data.success === true, 'Exam submitted successfully');
    assert(submitRes.data.total_questions === 75, 'Result contains 75 total questions');
    assert(submitRes.data.skipped_count === 70, 'Result contains 70 skipped questions');

    // 15. Verify double submit is rejected
    try {
        await api.post('/exam/submit', {}, candHeaders);
        assert(false, 'Expected double submit to fail');
    } catch (err) {
        assert(err.response?.status === 400, 'Subsequent submit blocked with HTTP 400');
    }

    socket.disconnect();
    console.log('\n=========================================');
    console.log('🎉 ALL PHASE 5 END-TO-END TESTS PASSED!');
    console.log('=========================================\n');
    process.exit(0);
}

runTest().catch((err) => {
    console.error('Fatal error in E2E test:', err.response?.data || err.message);
    process.exit(1);
});
