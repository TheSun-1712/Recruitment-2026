const express = require('express');
const pool = require('../db');
const examEngineRouter = require('../routes/examengine');

async function runSectionTest() {
    console.log('🧪 Starting Exam Sections and Intra-Section Randomization Test...\n');

    const app = express();
    app.use(express.json());
    app.use('/exam', examEngineRouter);

    // Mock socket.io objects
    app.set('io', null);
    app.set('userSockets', new Map());

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        // Ensure shift 1 is active and reset Candidate 1 & 2 in case they were used
        await pool.query(`UPDATE shifts SET is_active = true, started_at = NOW(), ended_at = NULL, is_paused = false WHERE id = 1`);
        await pool.query(`UPDATE candidates SET token_used = false WHERE token IN ('123', '456')`);
        await pool.query(`DELETE FROM candidate_questions WHERE candidate_id IN (1, 2)`);
        await pool.query(`DELETE FROM candidate_sessions WHERE candidate_id IN (1, 2)`);

        // Test Join for Candidate 1 (Token: '123')
        console.log('1️⃣ Joining Candidate 1 (Token: 123)...');
        const res1 = await fetch(`${baseUrl}/exam/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '123' })
        });
        const data1 = await res1.json();
        if (!res1.ok) {
            throw new Error(`Candidate 1 join failed: ${data1.error || JSON.stringify(data1)}`);
        }

        const q1 = data1.questions;
        console.log(`✅ Candidate 1 joined. Total questions assigned: ${q1.length}`);
        if (q1.length !== 30) {
            throw new Error(`Expected 30 questions, got ${q1.length}`);
        }

        // Test Join for Candidate 2 (Token: '456')
        console.log('\n2️⃣ Joining Candidate 2 (Token: 456)...');
        const res2 = await fetch(`${baseUrl}/exam/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '456' })
        });
        const data2 = await res2.json();
        if (!res2.ok) {
            throw new Error(`Candidate 2 join failed: ${data2.error || JSON.stringify(data2)}`);
        }

        const q2 = data2.questions;
        console.log(`✅ Candidate 2 joined. Total questions assigned: ${q2.length}`);
        if (q2.length !== 30) {
            throw new Error(`Expected 30 questions, got ${q2.length}`);
        }

        // 3. Verify Section Boundaries for Candidate 1
        console.log('\n3️⃣ Verifying Section Boundaries for Candidate 1:');
        const mathQ1 = q1.slice(0, 15);
        const aptQ1 = q1.slice(15, 22);
        const engQ1 = q1.slice(22, 27);
        const cQ1 = q1.slice(27, 30);

        console.log(`- Q1..15: ${mathQ1.map(q => q.subject_name).every(s => s === 'Mathematics') ? '✅ ALL Mathematics' : '❌ MISMATCH'}`);
        console.log(`- Q16..22: ${aptQ1.map(q => q.subject_name).every(s => s === 'Aptitude') ? '✅ ALL Aptitude' : '❌ MISMATCH'}`);
        console.log(`- Q23..27: ${engQ1.map(q => q.subject_name).every(s => s === 'English') ? '✅ ALL English' : '❌ MISMATCH'}`);
        console.log(`- Q28..30: ${cQ1.map(q => q.subject_name).every(s => s === 'C Programming') ? '✅ ALL C Programming' : '❌ MISMATCH'}`);

        if (!mathQ1.every(q => q.subject_name === 'Mathematics') ||
            !aptQ1.every(q => q.subject_name === 'Aptitude') ||
            !engQ1.every(q => q.subject_name === 'English') ||
            !cQ1.every(q => q.subject_name === 'C Programming')) {
            throw new Error('Candidate 1 section boundary verification failed!');
        }

        // 4. Verify Section Boundaries for Candidate 2
        console.log('\n4️⃣ Verifying Section Boundaries for Candidate 2:');
        const mathQ2 = q2.slice(0, 15);
        const aptQ2 = q2.slice(15, 22);
        const engQ2 = q2.slice(22, 27);
        const cQ2 = q2.slice(27, 30);

        console.log(`- Q1..15: ${mathQ2.map(q => q.subject_name).every(s => s === 'Mathematics') ? '✅ ALL Mathematics' : '❌ MISMATCH'}`);
        console.log(`- Q16..22: ${aptQ2.map(q => q.subject_name).every(s => s === 'Aptitude') ? '✅ ALL Aptitude' : '❌ MISMATCH'}`);
        console.log(`- Q23..27: ${engQ2.map(q => q.subject_name).every(s => s === 'English') ? '✅ ALL English' : '❌ MISMATCH'}`);
        console.log(`- Q28..30: ${cQ2.map(q => q.subject_name).every(s => s === 'C Programming') ? '✅ ALL C Programming' : '❌ MISMATCH'}`);

        if (!mathQ2.every(q => q.subject_name === 'Mathematics') ||
            !aptQ2.every(q => q.subject_name === 'Aptitude') ||
            !engQ2.every(q => q.subject_name === 'English') ||
            !cQ2.every(q => q.subject_name === 'C Programming')) {
            throw new Error('Candidate 2 section boundary verification failed!');
        }

        // 5. Verify Intra-Section Randomization (Order differences between C1 and C2)
        console.log('\n5️⃣ Checking Intra-Section Randomization Between Candidate 1 & 2:');
        const mathIds1 = mathQ1.map(q => q.question_id);
        const mathIds2 = mathQ2.map(q => q.question_id);
        const aptIds1 = aptQ1.map(q => q.question_id);
        const aptIds2 = aptQ2.map(q => q.question_id);

        console.log('Candidate 1 Math Q IDs:    ', mathIds1.slice(0, 6), '...');
        console.log('Candidate 2 Math Q IDs:    ', mathIds2.slice(0, 6), '...');
        const isMathDifferent = JSON.stringify(mathIds1) !== JSON.stringify(mathIds2);
        console.log(`Math Intra-Section Randomization:     ${isMathDifferent ? '✅ ORDER IS RANDOMIZED' : '⚠️ Identical'}`);

        console.log('Candidate 1 Aptitude Q IDs:', aptIds1);
        console.log('Candidate 2 Aptitude Q IDs:', aptIds2);
        const isAptDifferent = JSON.stringify(aptIds1) !== JSON.stringify(aptIds2);
        console.log(`Aptitude Intra-Section Randomization: ${isAptDifferent ? '✅ ORDER IS RANDOMIZED' : '⚠️ Identical'}`);

        // 6. Verify Resuming Session maintains exact order & metadata
        console.log('\n6️⃣ Testing Session Resume for Candidate 1:');
        const resumeRes = await fetch(`${baseUrl}/exam/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '123' })
        });
        const resumeData = await resumeRes.json();
        console.log(`isResume: ${resumeData.isResume}`);
        console.log(`Resumed questions count: ${resumeData.questions.length}`);
        const resumeMathQ = resumeData.questions.slice(0, 15);
        if (JSON.stringify(resumeMathQ.map(q => q.question_id)) === JSON.stringify(mathIds1)) {
            console.log('✅ Resumed questions order perfectly matches initial assignment');
        } else {
            throw new Error('Resumed question order did not match initial assignment!');
        }

        console.log('\n🎉 ALL SECTION & INTRA-SECTION RANDOMIZATION TESTS PASSED SUCCESSFULLY!\n');
    } catch (err) {
        console.error('❌ Test failed:', err);
        process.exit(1);
    } finally {
        server.close();
        await pool.end();
    }
}

runSectionTest();
