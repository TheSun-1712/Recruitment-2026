/**
 * Integration Test Script for Phase 2: Admin Backend APIs
 * Executes an end-to-end test suite against all Phase 2 endpoints.
 */

const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
let adminToken = null;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

// Attach token automatically
api.interceptors.request.use((config) => {
    if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
    }
    return config;
});

async function runTests() {
    console.log('🚀 Starting Phase 2 API Verification Suite against', BASE_URL);
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
        // 1. Health Check
        const health = await api.get('/');
        assert(health.data.status === 'ok', 'Server health check returns ok');

        // 2. Admin Login
        const loginRes = await api.post('/admin/login', {
            username: 'admin',
            password: 'admin123',
        });
        assert(loginRes.data.success && loginRes.data.accessToken, 'Admin login succeeded with JWT token');
        adminToken = loginRes.data.accessToken;

        // 3. Create Exam Config
        const examName = `Exam_Phase2_${Date.now()}`;
        const examRes = await api.post('/admin/exam', {
            name: examName,
            total_duration_min: 60,
            grace_join_min: 15,
            questions_per_shift: 75,
        });
        assert(examRes.data.success && examRes.data.exam.id, `Created exam '${examName}' (ID: ${examRes.data.exam.id})`);
        const examId = examRes.data.exam.id;

        // 3b. Activate Exam
        const actRes = await api.post(`/admin/exam/${examId}/activate`);
        assert(actRes.data.success && actRes.data.exam.is_active === true, 'Exam set as active');

        // 4. Create Subjects & Topics (Syllabus tree)
        const subj1 = await api.post('/admin/subjects', { exam_id: examId, name: 'Engineering Mathematics' });
        const subj2 = await api.post('/admin/subjects', { exam_id: examId, name: 'Computer Science Core' });
        assert(subj1.data.success && subj2.data.success, 'Created 2 subjects: Engg Math and CS Core');

        const s1Id = subj1.data.subject.id;
        const s2Id = subj2.data.subject.id;

        const top1 = await api.post(`/admin/subjects/${s1Id}/topics`, { name: 'Calculus' });
        const top2 = await api.post(`/admin/subjects/${s1Id}/topics`, { name: 'Linear Algebra' });
        const top3 = await api.post(`/admin/subjects/${s2Id}/topics`, { name: 'Data Structures' });
        const top4 = await api.post(`/admin/subjects/${s2Id}/topics`, { name: 'Algorithms' });
        const top5 = await api.post(`/admin/subjects/${s2Id}/topics`, { name: 'Operating Systems' });
        assert(
            top1.data.success && top2.data.success && top3.data.success && top4.data.success && top5.data.success,
            'Created 5 topics across 2 subjects'
        );

        const topics = [top1.data.topic, top2.data.topic, top3.data.topic, top4.data.topic, top5.data.topic];

        // Verify nested syllabus tree
        const treeRes = await api.get(`/admin/subjects?exam_id=${examId}`);
        assert(treeRes.data.subjects.length >= 2, 'GET /admin/subjects returns nested tree with child topics');

        // 5. Create Shifts
        const shift1Res = await api.post('/admin/shifts', { exam_id: examId, name: 'Shift 1 - Morning' });
        const shift2Res = await api.post('/admin/shifts', { exam_id: examId, name: 'Shift 2 - Afternoon' });
        assert(shift1Res.data.success && shift2Res.data.success, 'Created Shift 1 and Shift 2');

        const shift1 = shift1Res.data.shift;
        const shift2 = shift2Res.data.shift;

        // 6. Candidates & Spot Token Generation
        const cand1Res = await api.post('/admin/candidates', {
            name: 'Ravi Kumar',
            roll_no: `21CS${Math.floor(1000 + Math.random() * 9000)}`,
            branch: 'CSE',
            section: 'A',
            email: `ravi_${Date.now()}@exam.lan`,
            shift_id: shift1.id,
        });
        assert(cand1Res.data.success, 'Spot registered candidate 1');
        const token1 = cand1Res.data.candidate.token;
        const tokenPattern = /^CSE-A-\d{4}-[A-F0-9]{6}$/;
        assert(tokenPattern.test(token1), `Token format valid: ${token1}`);

        // Bulk candidate import
        const bulkCandRes = await api.post('/admin/candidates/bulk', {
            candidates: [
                {
                    name: 'Candidate Bulk 1',
                    roll_no: `21ECE${Math.floor(1000 + Math.random() * 9000)}`,
                    branch: 'ECE',
                    section: 'B',
                    shift_id: shift1.id,
                },
                {
                    name: 'Candidate Bulk 2',
                    roll_no: `21ME${Math.floor(1000 + Math.random() * 9000)}`,
                    branch: 'MECH',
                    section: 'A',
                    shift_id: shift2.id,
                },
            ],
        });
        assert(bulkCandRes.data.importedCount === 2, 'Bulk candidate import added 2 candidates');

        // 7. Seed Question Bank for 5 topics
        // Each topic needs 15 questions per shift = 5 easy, 5 medium, 5 hard.
        // For 2 shifts: 10 easy, 10 medium, 10 hard per topic = 30 per topic * 5 = 150 questions total.
        console.log('⏳ Seeding 150 sample questions across 5 topics...');
        const questionsToSeed = [];
        const diffs = ['easy', 'medium', 'hard'];

        for (const t of topics) {
            for (const d of diffs) {
                for (let i = 1; i <= 10; i++) {
                    questionsToSeed.push({
                        topic_id: t.id,
                        difficulty: d,
                        body: `Question ${i} on ${t.name} (${d}). Evaluate $\\int_{0}^{${i}} x^2\\,dx$ or matrix $\\begin{pmatrix} 1 & ${i} \\\\ 0 & 1 \\end{pmatrix}$.`,
                        option_a: `$\\frac{${i}^3}{3}$`,
                        option_b: `$\\frac{${i}^2}{2}$`,
                        option_c: `${i * 2}`,
                        option_d: `${i * 3}`,
                        correct_opt: 'a',
                        explanation: `Applying standard formula for ${t.name} problem ${i}.`,
                    });
                }
            }
        }

        const bulkQRes = await api.post('/admin/questions/bulk', {
            exam_id: examId,
            questions: questionsToSeed,
        });
        assert(bulkQRes.data.importedCount === 150, `Successfully seeded ${bulkQRes.data.importedCount} questions`);

        // Check count by topic
        const countByTopic = await api.get(`/admin/questions/count-by-topic?exam_id=${examId}`);
        assert(countByTopic.data.counts.length === 5, 'GET /admin/questions/count-by-topic returned 5 topics');

        // 8. Configure Weightage
        // 5 topics * (5 easy + 5 medium + 5 hard = 15) = 75 total questions per shift
        const weightageRules = topics.map((t) => ({
            topic_id: t.id,
            easy_count: 5,
            medium_count: 5,
            hard_count: 5,
        }));

        const weightageRes = await api.put(`/admin/weightage/${examId}`, { rules: weightageRules });
        assert(weightageRes.data.success && weightageRes.data.count === 5, 'Upserted 5 weightage rules');

        // Validate weightage
        const validateRes = await api.get(`/admin/weightage/${examId}/validate?num_shifts=2`);
        assert(validateRes.data.totalConfigured === 75, `Total configured questions is ${validateRes.data.totalConfigured} (target 75)`);
        assert(validateRes.data.valid === true, 'Weightage validation passed with zero shortfalls for 2 shifts');

        // 9. Multi-Shift Paper Generation
        console.log('⏳ Running paper generation for 2 shifts...');
        const genRes = await api.post(`/admin/generate/${examId}`, { num_shifts: 2 });
        assert(genRes.data.success, 'Paper generation succeeded');
        assert(genRes.data.shifts.length === 2, 'Generated papers for 2 shifts');
        assert(
            genRes.data.shifts[0].question_count === 75 && genRes.data.shifts[1].question_count === 75,
            'Both Shift 1 and Shift 2 received exactly 75 questions'
        );

        // Verify zero question overlap between Shift 1 and Shift 2 in DB
        const pool = require('../db');
        const qOverlapCheck = await pool.query(
            `SELECT sq1.question_id 
             FROM shift_questions sq1
             JOIN shift_questions sq2 ON sq1.question_id = sq2.question_id
             WHERE sq1.shift_id = $1 AND sq2.shift_id = $2`,
            [shift1.id, shift2.id]
        );
        assert(qOverlapCheck.rows.length === 0, 'ZERO question overlap confirmed between Shift 1 and Shift 2 papers');

        // 10. Shift Lifecycle Transitions
        const startRes = await api.post(`/admin/shifts/${shift1.id}/start`);
        assert(startRes.data.shift.is_active === true, 'Shift 1 started');

        const pauseRes = await api.post(`/admin/shifts/${shift1.id}/pause`);
        assert(pauseRes.data.shift.is_paused === true, 'Shift 1 paused');

        const resumeRes = await api.post(`/admin/shifts/${shift1.id}/resume`);
        assert(resumeRes.data.shift.is_paused === false, 'Shift 1 resumed');

        const extraTimeRes = await api.post(`/admin/shifts/${shift1.id}/extra-time`, { extra_minutes: 10 });
        assert(extraTimeRes.data.shift.extra_time_min === 10, 'Shift 1 granted 10 extra minutes');

        const endRes = await api.post(`/admin/shifts/${shift1.id}/end`);
        assert(endRes.data.shift.is_active === false && endRes.data.shift.ended_at, 'Shift 1 force-ended');

        // 11. Results & Export CSV
        const resultsList = await api.get('/admin/results');
        assert(Array.isArray(resultsList.data.results), 'GET /admin/results returns results array');

        const csvRes = await api.get('/admin/results/export.csv');
        assert(typeof csvRes.data === 'string' && csvRes.data.includes('Rank'), 'GET /admin/results/export.csv generated CSV');

        // 12. Dashboard Stats
        const statsRes = await api.get('/admin/dashboard-stats');
        assert(statsRes.data.totalQuestions >= 150, `Dashboard stats shows ${statsRes.data.totalQuestions} questions in bank`);
        assert(statsRes.data.totalCandidates >= 3, `Dashboard stats shows ${statsRes.data.totalCandidates} candidates registered`);

        console.log('\n=========================================');
        console.log(`🎉 ALL PHASE 2 TESTS PASSED! (${passed} checks passed, ${failed} failed)`);
        console.log('=========================================\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ TEST RUN ABORTED DUE TO ERROR:', err.response?.data || err.message);
        process.exit(1);
    }
}

runTests();
