/**
 * G-Prime MCQ Platform — Complete Test Seed Script
 * 
 * What this does:
 *   1. Cleans all exam/shift/candidate/question data (preserves admins table)
 *   2. Creates 1 active exam: "GATE Mock Test 2026" (20 questions per shift for easy testing)
 *   3. Creates 2 shifts: "Morning Batch" and "Afternoon Batch"
 *   4. Creates 5 subjects with topics
 *   5. Sets weightage rules summing to 20 (questions_per_shift)
 *   6. Inserts 40 sample questions (2 per shift × 2 shifts, mix of plain text and LaTeX)
 *   7. Generates shift papers (assigns 20 unique questions to each shift)
 *   8. Inserts 15 sample candidates with known tokens
 * 
 * Run: node server/scripts/seed_test_data.js
 * 
 * NOTE: Morning Batch shift is created but NOT started.
 *       Go to /admin/shifts and click "Start" on "Morning Batch" before testing candidate login.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5434'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'mcq_exam_db',
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Cleaning old test data...');
    await client.query('DELETE FROM results');
    await client.query('DELETE FROM candidate_questions');
    await client.query('DELETE FROM candidate_sessions');
    await client.query('DELETE FROM candidates');
    await client.query('DELETE FROM shift_questions');
    await client.query('DELETE FROM weightage_rules');
    await client.query('DELETE FROM questions');
    await client.query('DELETE FROM topics');
    await client.query('DELETE FROM subjects');
    await client.query('DELETE FROM shifts');
    await client.query('DELETE FROM exam_config');
    // Reset sequences
    const seqs = ['exam_config_id_seq', 'shifts_id_seq', 'subjects_id_seq', 'topics_id_seq',
      'questions_id_seq', 'candidates_id_seq', 'weightage_rules_id_seq', 'shift_questions_id_seq'];
    for (const seq of seqs) {
      await client.query(`SELECT setval('${seq}', 1, false)`);
    }
    console.log('Cleaned OK');

    // 1. EXAM CONFIG (20 questions per shift for easier testing)
    const examRes = await client.query(`
      INSERT INTO exam_config (name, total_duration_min, grace_join_min, questions_per_shift, is_active)
      VALUES ('GATE Mock Test 2026', 60, 15, 20, true)
      RETURNING id
    `);
    const examId = examRes.rows[0].id;
    console.log('Exam created: ID=' + examId);

    // 2. SHIFTS
    const shift1Res = await client.query(
      `INSERT INTO shifts (exam_id, name, scheduled_start, is_active, paper_generated)
       VALUES ($1, 'Morning Batch', '2026-09-11 09:00:00+05:30', false, false) RETURNING id`, [examId]);
    const shift1Id = shift1Res.rows[0].id;
    const shift2Res = await client.query(
      `INSERT INTO shifts (exam_id, name, scheduled_start, is_active, paper_generated)
       VALUES ($1, 'Afternoon Batch', '2026-09-11 14:00:00+05:30', false, false) RETURNING id`, [examId]);
    const shift2Id = shift2Res.rows[0].id;
    console.log('Shifts created: Shift1=' + shift1Id + ' Shift2=' + shift2Id);

    // 3. SUBJECTS & TOPICS
    const subjectDefs = [
      { name: 'Engineering Mathematics', topics: ['Calculus', 'Linear Algebra', 'Probability & Statistics'] },
      { name: 'Digital Logic', topics: ['Boolean Algebra', 'Combinational Circuits'] },
      { name: 'Computer Organization', topics: ['Instruction Set Architecture'] },
      { name: 'Data Structures', topics: ['Arrays & Sorting', 'Trees & Graphs'] },
      { name: 'Algorithms', topics: ['Dynamic Programming', 'Greedy Algorithms'] },
    ];

    const topicIdMap = {};
    for (const sub of subjectDefs) {
      const sRes = await client.query(
        `INSERT INTO subjects (exam_id, name) VALUES ($1, $2) RETURNING id`, [examId, sub.name]);
      const subjectId = sRes.rows[0].id;
      for (const topicName of sub.topics) {
        const tRes = await client.query(
          `INSERT INTO topics (subject_id, name) VALUES ($1, $2) RETURNING id`, [subjectId, topicName]);
        topicIdMap[topicName] = tRes.rows[0].id;
      }
    }
    console.log('Subjects & topics created: ' + Object.keys(topicIdMap).join(', '));

    // 4. WEIGHTAGE RULES (sum = 20 = questions_per_shift)
    // E=easy M=medium H=hard
    const weightageRules = [
      { topic: 'Calculus', easy: 2, medium: 1, hard: 0 }, // 3
      { topic: 'Linear Algebra', easy: 1, medium: 1, hard: 0 }, // 2
      { topic: 'Probability & Statistics', easy: 1, medium: 1, hard: 0 }, // 2
      { topic: 'Boolean Algebra', easy: 1, medium: 1, hard: 0 }, // 2
      { topic: 'Combinational Circuits', easy: 0, medium: 1, hard: 1 }, // 2
      { topic: 'Instruction Set Architecture', easy: 0, medium: 1, hard: 1 }, // 2
      { topic: 'Arrays & Sorting', easy: 1, medium: 1, hard: 0 }, // 2
      { topic: 'Trees & Graphs', easy: 0, medium: 1, hard: 1 }, // 2
      { topic: 'Dynamic Programming', easy: 0, medium: 0, hard: 2 }, // 2
      { topic: 'Greedy Algorithms', easy: 0, medium: 1, hard: 0 }, // 1
      // Total: 6E + 9M + 5H = 20 per shift
    ];
    let totalW = 0;
    for (const rule of weightageRules) {
      await client.query(
        `INSERT INTO weightage_rules (exam_id, topic_id, easy_count, medium_count, hard_count) VALUES ($1,$2,$3,$4,$5)`,
        [examId, topicIdMap[rule.topic], rule.easy, rule.medium, rule.hard]);
      totalW += rule.easy + rule.medium + rule.hard;
    }
    console.log('Weightage rules set. Total per shift: ' + totalW);

    // 5. QUESTIONS (40 total = 2 per slot because we have 2 shifts)
    const questions = [
      // CALCULUS easy x4 (2 per shift)
      { topic: 'Calculus', difficulty: 'easy', body: 'Find $\\int x^2\\,dx$', option_a: '$\\frac{x^3}{3}+C$', option_b: '$\\frac{x^2}{2}+C$', option_c: '$x^3+C$', option_d: '$\\frac{x^3}{2}+C$', correct_opt: 'a', explanation: 'Power rule: integral of x^n is x^(n+1)/(n+1)' },
      { topic: 'Calculus', difficulty: 'easy', body: 'Derivative of $\\sin(x)$ is:', option_a: '$-\\cos(x)$', option_b: '$\\cos(x)$', option_c: '$\\tan(x)$', option_d: '$\\sec^2(x)$', correct_opt: 'b', explanation: 'd/dx sin(x) = cos(x)' },
      { topic: 'Calculus', difficulty: 'easy', body: 'Derivative of $e^{3x}$ is:', option_a: '$e^{3x}$', option_b: '$3e^x$', option_c: '$3e^{3x}$', option_d: '$e^{x+3}$', correct_opt: 'c', explanation: 'Chain rule: 3e^(3x)' },
      { topic: 'Calculus', difficulty: 'easy', body: 'Evaluate $\\int_0^1 2x\\,dx$', option_a: '$0$', option_b: '$2$', option_c: '$1$', option_d: '$4$', correct_opt: 'c', explanation: '[x^2] from 0 to 1 = 1' },
      // CALCULUS medium x2
      { topic: 'Calculus', difficulty: 'medium', body: '$\\lim_{x \\to 0} \\frac{\\sin x}{x}$ equals:', option_a: '$1$', option_b: '$0$', option_c: '$\\infty$', option_d: 'Does not exist', correct_opt: 'a', explanation: 'Standard limit = 1' },
      { topic: 'Calculus', difficulty: 'medium', body: 'Local minimum of $f(x)=x^3-3x+2$ occurs at:', option_a: '$x=1$', option_b: '$x=-1$', option_c: '$x=0$', option_d: '$x=3$', correct_opt: 'a', explanation: "f'=3x^2-3=0 => x=+-1; f''(1)=6>0 so x=1 is min" },
      // LINEAR ALGEBRA easy x2
      { topic: 'Linear Algebra', difficulty: 'easy', body: '$\\det\\begin{pmatrix}3&1\\\\2&4\\end{pmatrix}=$', option_a: '$10$', option_b: '$14$', option_c: '$12$', option_d: '$8$', correct_opt: 'a', explanation: '3*4 - 1*2 = 10' },
      { topic: 'Linear Algebra', difficulty: 'easy', body: '$I^{10}$ (I=identity matrix) equals:', option_a: '$10I$', option_b: '$I$', option_c: '$0$', option_d: '$10$', correct_opt: 'b', explanation: 'Any power of I is I' },
      // LINEAR ALGEBRA medium x2
      { topic: 'Linear Algebra', difficulty: 'medium', body: 'Rank of $\\begin{pmatrix}1&2&3\\\\2&4&6\\\\3&6&9\\end{pmatrix}$:', option_a: '$1$', option_b: '$2$', option_c: '$3$', option_d: '$0$', correct_opt: 'a', explanation: 'All rows are multiples of row 1, so rank=1' },
      { topic: 'Linear Algebra', difficulty: 'medium', body: 'Eigenvalues of a 2x2 matrix are 3 and 5. Trace is:', option_a: '$15$', option_b: '$2$', option_c: '$8$', option_d: '$-2$', correct_opt: 'c', explanation: 'Trace = sum of eigenvalues = 3+5=8' },
      // PROBABILITY easy x2
      { topic: 'Probability & Statistics', difficulty: 'easy', body: 'P(exactly 1 head in 2 fair coin tosses)=', option_a: '$1/4$', option_b: '$3/4$', option_c: '$1/2$', option_d: '$1$', correct_opt: 'c', explanation: 'HT,TH = 2/4 = 1/2' },
      { topic: 'Probability & Statistics', difficulty: 'easy', body: 'Expected value of a fair 6-sided die:', option_a: '$3$', option_b: '$3.5$', option_c: '$4$', option_d: '$2.5$', correct_opt: 'b', explanation: '(1+2+3+4+5+6)/6=3.5' },
      // PROBABILITY medium x2
      { topic: 'Probability & Statistics', difficulty: 'medium', body: 'P(A)=0.4, P(B)=0.3, A and B independent. P(A∩B)=', option_a: '$0.7$', option_b: '$0.12$', option_c: '$0.1$', option_d: '$0.58$', correct_opt: 'b', explanation: '0.4*0.3=0.12' },
      { topic: 'Probability & Statistics', difficulty: 'medium', body: 'In normal distribution, % within $\\pm 2\\sigma$:', option_a: '68%', option_b: '99.7%', option_c: '95%', option_d: '50%', correct_opt: 'c', explanation: '68-95-99.7 rule' },
      // BOOLEAN easy x2
      { topic: 'Boolean Algebra', difficulty: 'easy', body: 'Simplify $A \\cdot (A+B)$:', option_a: '$A$', option_b: '$B$', option_c: '$A+B$', option_d: '$AB$', correct_opt: 'a', explanation: 'Absorption law' },
      { topic: 'Boolean Algebra', difficulty: 'easy', body: "De Morgan: $(A+B)'=$", option_a: "$A'+B'$", option_b: '$AB$', option_c: "$A'B'$", option_d: '$A+B$', correct_opt: 'c', explanation: "De Morgan's theorem" },
      // BOOLEAN medium x2
      { topic: 'Boolean Algebra', difficulty: 'medium', body: "Simplify $F=A'B+AB'+AB$:", option_a: '$A+B$', option_b: '$AB$', option_c: "$A'+B$", option_d: "$A+B'$", correct_opt: 'a', explanation: 'A+B' },
      { topic: 'Boolean Algebra', difficulty: 'medium', body: 'Minterms in 3-variable Boolean function:', option_a: '$4$', option_b: '$6$', option_c: '$8$', option_d: '$16$', correct_opt: 'c', explanation: '2^3=8' },
      // COMBINATIONAL medium x2
      { topic: 'Combinational Circuits', difficulty: 'medium', body: 'Half adder carry output (C):', option_a: '$A \\oplus B$', option_b: '$A+B$', option_c: '$A \\cdot B$', option_d: "$A'B$", correct_opt: 'c', explanation: 'Carry = A AND B' },
      { topic: 'Combinational Circuits', difficulty: 'medium', body: '4-to-1 MUX needs how many select lines:', option_a: '$1$', option_b: '$2$', option_c: '$4$', option_d: '$3$', correct_opt: 'b', explanation: '2^n = 4, so n=2 select lines' },
      // COMBINATIONAL hard x2
      { topic: 'Combinational Circuits', difficulty: 'hard', body: 'K-map of $F(A,B,C)=\\sum(1,3,5,7)$:', option_a: '$AB$', option_b: '$A+B$', option_c: '$C$', option_d: '$BC$', correct_opt: 'c', explanation: 'Minterms where C=1' },
      { topic: 'Combinational Circuits', difficulty: 'hard', body: 'Min 2-input NAND gates for $F=AB+A\'C$:', option_a: '$3$', option_b: '$4$', option_c: '$5$', option_d: '$6$', correct_opt: 'c', explanation: '5 NAND gates in NAND-NAND form' },
      // INSTRUCTION SET medium x2
      { topic: 'Instruction Set Architecture', difficulty: 'medium', body: '8-bit 2\'s complement of 11111110:', option_a: '$-1$', option_b: '$-2$', option_c: '$254$', option_d: '$126$', correct_opt: 'b', explanation: 'Invert+1 = -2' },
      { topic: 'Instruction Set Architecture', difficulty: 'medium', body: 'In immediate addressing, operand is:', option_a: 'In a register', option_b: 'A memory address', option_c: 'Part of the instruction', option_d: 'On the stack', correct_opt: 'c', explanation: 'Immediate = embedded in instruction' },
      // INSTRUCTION SET hard x2
      { topic: 'Instruction Set Architecture', difficulty: 'hard', body: '32-bit instruction: 6-bit opcode, two 5-bit register fields. Immediate field size:', option_a: '$10$', option_b: '$16$', option_c: '$21$', option_d: '$26$', correct_opt: 'b', explanation: '32-6-5-5=16 bits' },
      { topic: 'Instruction Set Architecture', difficulty: 'hard', body: '5-stage pipeline: cycles to complete 10 instructions:', option_a: '$50$', option_b: '$14$', option_c: '$15$', option_d: '$10$', correct_opt: 'b', explanation: '5+(10-1)=14 cycles' },
      // ARRAYS easy x2
      { topic: 'Arrays & Sorting', difficulty: 'easy', body: 'Time complexity of Binary Search on sorted array:', option_a: '$O(n)$', option_b: '$O(\\log n)$', option_c: '$O(n\\log n)$', option_d: '$O(1)$', correct_opt: 'b', explanation: 'O(log n)' },
      { topic: 'Arrays & Sorting', difficulty: 'easy', body: 'Best average-case sorting algorithm:', option_a: 'Bubble $O(n^2)$', option_b: 'Insertion $O(n^2)$', option_c: 'Merge Sort $O(n \\log n)$', option_d: 'Selection $O(n^2)$', correct_opt: 'c', explanation: 'Merge Sort O(n log n)' },
      // ARRAYS medium x2
      { topic: 'Arrays & Sorting', difficulty: 'medium', body: 'Space complexity of Merge Sort:', option_a: '$O(1)$', option_b: '$O(\\log n)$', option_c: '$O(n)$', option_d: '$O(n^2)$', correct_opt: 'c', explanation: 'O(n) auxiliary space' },
      { topic: 'Arrays & Sorting', difficulty: 'medium', body: 'Which is an in-place sorting algorithm?', option_a: 'Merge Sort', option_b: 'Counting Sort', option_c: 'Heap Sort', option_d: 'Radix Sort', correct_opt: 'c', explanation: 'Heap Sort: O(1) extra space' },
      // TREES medium x2
      { topic: 'Trees & Graphs', difficulty: 'medium', body: 'Height of complete binary tree with n nodes:', option_a: '$O(n)$', option_b: '$O(\\sqrt{n})$', option_c: '$O(\\log n)$', option_d: '$O(n^2)$', correct_opt: 'c', explanation: 'O(log n)' },
      { topic: 'Trees & Graphs', difficulty: 'medium', body: 'Inorder traversal of BST gives:', option_a: 'Sorted ascending', option_b: 'Sorted descending', option_c: 'Random order', option_d: 'Level order', correct_opt: 'a', explanation: 'Left-Root-Right on BST = ascending order' },
      // TREES hard x2
      { topic: 'Trees & Graphs', difficulty: 'hard', body: 'BFS/DFS time complexity on graph with V vertices E edges:', option_a: '$O(V^2)$', option_b: '$O(V+E)$', option_c: '$O(E \\log V)$', option_d: '$O(VE)$', correct_opt: 'b', explanation: 'O(V+E)' },
      { topic: 'Trees & Graphs', difficulty: 'hard', body: "Dijkstra's algorithm fails with:", option_a: 'Multiple components', option_b: 'Negative weight edges', option_c: 'Cycles', option_d: 'Directed edges', correct_opt: 'b', explanation: 'Use Bellman-Ford for negative weights' },
      // DYNAMIC PROGRAMMING hard x4
      { topic: 'Dynamic Programming', difficulty: 'hard', body: 'LCS time complexity for strings length m,n:', option_a: '$O(m+n)$', option_b: '$O(mn)$', option_c: '$O(m \\log n)$', option_d: '$O(2^{m+n})$', correct_opt: 'b', explanation: 'O(mn) DP table' },
      { topic: 'Dynamic Programming', difficulty: 'hard', body: '0/1 Knapsack DP time complexity (n items, W capacity):', option_a: '$O(nW)$', option_b: '$O(n \\log W)$', option_c: '$O(2^n)$', option_d: '$O(n^2)$', correct_opt: 'a', explanation: 'O(nW) table' },
      { topic: 'Dynamic Programming', difficulty: 'hard', body: 'Fibonacci recurrence for DP: F(n)=', option_a: '$F(n-1)+F(n+1)$', option_b: '$F(n-1)\\cdot F(n-2)$', option_c: '$F(n-1)+F(n-2)$, F(0)=0,F(1)=1', option_d: '$2F(n-1)-1$', correct_opt: 'c', explanation: 'Classic Fibonacci' },
      { topic: 'Dynamic Programming', difficulty: 'hard', body: 'Edit distance between "KITTEN" and "SITTING":', option_a: '$5$', option_b: '$2$', option_c: '$4$', option_d: '$3$', correct_opt: 'd', explanation: '3 operations: K->S, E->I, insert G' },
      // GREEDY medium x2
      { topic: 'Greedy Algorithms', difficulty: 'medium', body: 'Activity Selection greedy strategy:', option_a: 'Earliest finish time', option_b: 'Shortest duration', option_c: 'Earliest start time', option_d: 'Most conflicts avoided', correct_opt: 'a', explanation: 'Sort by earliest finish time' },
      { topic: 'Greedy Algorithms', difficulty: 'medium', body: 'Huffman coding is used for:', option_a: 'Shortest paths', option_b: 'Lossless compression', option_c: 'Sorting', option_d: 'Network flow', correct_opt: 'b', explanation: 'Variable-length prefix codes for compression' },
    ];

    const insertedQs = [];
    for (const q of questions) {
      const topicId = topicIdMap[q.topic];
      const qRes = await client.query(
        `INSERT INTO questions (exam_id, topic_id, difficulty, body, option_a, option_b, option_c, option_d, correct_opt, explanation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [examId, topicId, q.difficulty, q.body, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_opt, q.explanation]);
      insertedQs.push({ id: qRes.rows[0].id, topic: q.topic, difficulty: q.difficulty });
    }
    console.log('Inserted ' + insertedQs.length + ' questions');

    // 6. GENERATE SHIFT PAPERS
    const qByKey = {};
    for (const q of insertedQs) {
      const key = q.topic + '::' + q.difficulty;
      if (!qByKey[key]) qByKey[key] = [];
      qByKey[key].push(q.id);
    }

    const shift1Qs = [];
    const shift2Qs = [];

    for (const rule of weightageRules) {
      const assign = (difficulty, count) => {
        if (count === 0) return;
        const key = rule.topic + '::' + difficulty;
        const pool = qByKey[key] || [];
        shift1Qs.push(...pool.slice(0, count));
        shift2Qs.push(...pool.slice(count, count * 2));
      };
      assign('easy', rule.easy);
      assign('medium', rule.medium);
      assign('hard', rule.hard);
    }

    for (const qId of shift1Qs) {
      await client.query(`INSERT INTO shift_questions (shift_id, question_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [shift1Id, qId]);
    }
    for (const qId of shift2Qs) {
      await client.query(`INSERT INTO shift_questions (shift_id, question_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [shift2Id, qId]);
    }
    await client.query(`UPDATE shifts SET paper_generated = true WHERE id = ANY($1)`, [[shift1Id, shift2Id]]);
    console.log('Papers: Shift1=' + shift1Qs.length + ' Qs, Shift2=' + shift2Qs.length + ' Qs');

    // 7. CANDIDATES
    const candidates = [
      { name: 'Arjun Sharma', roll_no: '21CS001', branch: 'CSE', section: 'A', email: 'arjun@test.com', token: '123', shift_id: shift1Id },
      { name: 'Priya Nair', roll_no: '21CS002', branch: 'CSE', section: 'A', email: 'priya@test.com', token: '456', shift_id: shift1Id },
      { name: 'Rahul Singh', roll_no: '21CS003', branch: 'CSE', section: 'B', email: 'rahul@test.com', token: '789', shift_id: shift1Id },
      { name: 'Ananya Rao', roll_no: '21CS004', branch: 'CSE', section: 'B', email: 'ananya@test.com', token: '101', shift_id: shift1Id },
      { name: 'Karthik M', roll_no: '21CS005', branch: 'CSE', section: 'A', email: 'karthik@test.com', token: '102', shift_id: shift1Id },
      { name: 'Divya Reddy', roll_no: '21ECE001', branch: 'ECE', section: 'A', email: 'divya@test.com', token: '103', shift_id: shift1Id },
      { name: 'Sai Teja', roll_no: '21ECE002', branch: 'ECE', section: 'A', email: 'sai@test.com', token: '104', shift_id: shift1Id },
      { name: 'Meera Iyer', roll_no: '21ECE003', branch: 'ECE', section: 'B', email: 'meera@test.com', token: '105', shift_id: shift1Id },
      { name: 'Lakshmi Devi', roll_no: '21ME001', branch: 'MECH', section: 'A', email: 'lakshmi@test.com', token: '106', shift_id: shift1Id },
      { name: 'Vijay Rajan', roll_no: '21ME002', branch: 'MECH', section: 'B', email: 'vijay@test.com', token: '107', shift_id: shift1Id },
      { name: 'Rohan Gupta', roll_no: '21CS006', branch: 'CSE', section: 'A', email: 'rohan@test.com', token: '108', shift_id: shift2Id },
      { name: 'Sneha Patil', roll_no: '21CS007', branch: 'CSE', section: 'B', email: 'sneha@test.com', token: '109', shift_id: shift2Id },
      { name: 'Aditya Kumar', roll_no: '21CS008', branch: 'CSE', section: 'A', email: 'aditya@test.com', token: '110', shift_id: shift2Id },
      { name: 'Harini Suresh', roll_no: '21EEE001', branch: 'EEE', section: 'A', email: 'harini@test.com', token: '111', shift_id: shift2Id },
      { name: 'Naveen Chandra', roll_no: '21EEE002', branch: 'EEE', section: 'A', email: 'naveen@test.com', token: '112', shift_id: shift2Id },
    ];
    for (const c of candidates) {
      await client.query(
        `INSERT INTO candidates (name, roll_no, branch, section, email, token, shift_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [c.name, c.roll_no, c.branch, c.section, c.email, c.token, c.shift_id]);
    }
    console.log('Inserted ' + candidates.length + ' candidates');

    await client.query('COMMIT');

    console.log('\n=== SEED COMPLETE ===\n');
    console.log('Exam: "GATE Mock Test 2026" (ID=' + examId + ', 20 Q/shift, 60 min)');
    console.log('\nNEXT STEPS:');
    console.log('1. Go to http://localhost:5173/admin/login  [admin / admin123]');
    console.log('2. Go to /admin/shifts -> Click START on "Morning Batch"');
    console.log('3. On candidate browser: http://localhost:5173/');
    console.log('\nMORNING BATCH TOKENS (shift must be started first):');
    candidates.filter(c => c.shift_id === shift1Id).forEach(c =>
      console.log('  ' + c.name.padEnd(20) + c.token)
    );
    console.log('\nAFTERNOON BATCH TOKENS (start Afternoon Batch first):');
    candidates.filter(c => c.shift_id === shift2Id).forEach(c =>
      console.log('  ' + c.name.padEnd(20) + c.token)
    );

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('SEED FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
