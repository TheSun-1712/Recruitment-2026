/**
 * Seed 300 sample questions into mcq_exam_db.
 *
 * Distribution (4 shifts × 75 per shift = 300 total):
 * Topic            Easy  Med  Hard  Total
 * Algebra            0   20    0     20
 * Geometry & Vect   12   16   12     40
 * Calculus           0   12   20     32
 * Trigonometry       0   12   12     24
 * Probability       12   12   12     36
 * P&C                0   12    0     12
 * General Aptitude   0   40   24     64
 * General (English)  0   28   16     44
 * General (C Prog)   0   28    0     28
 *                   24  180   96    300
 */

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5434,
  database: process.env.DB_NAME || 'mcq_exam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});

const EXAM_ID = 1;

// topic_id -> based on the DB scan above
const TOPICS = {
  algebra:     { id: 16, name: 'Algebra',            subject: 'Mathematics' },
  geometry:    { id: 17, name: 'Geometry and Vectors', subject: 'Mathematics' },
  calculus:    { id: 18, name: 'Calculus',            subject: 'Mathematics' },
  trigonometry:{ id: 19, name: 'Trigonometry',        subject: 'Mathematics' },
  probability: { id: 20, name: 'Probability',         subject: 'Mathematics' },
  pnc:         { id: 21, name: 'P&C',                 subject: 'Mathematics' },
  aptitude:    { id: 24, name: 'General Aptitude',    subject: 'Aptitude' },
  english:     { id: 22, name: 'General',             subject: 'English' },
  cprog:       { id: 23, name: 'General',             subject: 'C Programming' },
};

// Total questions to seed per topic per difficulty
const PLAN = [
  // [topicKey, easy, medium, hard]
  ['algebra',      0, 20,  0],
  ['geometry',    12, 16, 12],
  ['calculus',     0, 12, 20],
  ['trigonometry', 0, 12, 12],
  ['probability', 12, 12, 12],
  ['pnc',          0, 12,  0],
  ['aptitude',     0, 40, 24],
  ['english',      0, 28, 16],
  ['cprog',        0, 28,  0],
];

// Sample question templates per topic (rotated + numbered)
const QUESTION_TEMPLATES = {
  algebra: {
    easy:   [],
    medium: [
      'Find the roots of the quadratic equation: {a}x² + {b}x + {c} = 0.',
      'Simplify the expression: (x + {a})(x - {b}) / (x² - {c})',
      'If α and β are roots of 2x² - 5x + 3 = 0, find α² + β².',
      'Solve for x: log₂(x + {a}) = {b}',
      'Find the sum of all integers from 1 to {a} that are divisible by {b}.',
    ],
    hard:   [],
  },
  geometry: {
    easy: [
      'What is the distance between points ({a},{b}) and ({c},{d})?',
      'Find the midpoint of the line segment joining ({a},{b}) and ({c},{d}).',
      'A vector has components ({a},{b}). Find its magnitude.',
    ],
    medium: [
      'Find the angle between vectors A = {a}i + {b}j and B = {c}i + {d}j.',
      'Determine the equation of a circle with center ({a},{b}) and radius {c}.',
      'Find the area of triangle with vertices A({a},{b}), B({c},{d}), C({e},{f}).',
      'If a point divides the segment joining ({a},{b}) and ({c},{d}) in ratio {e}:{f}, find the point.',
    ],
    hard: [
      'Find the vector projection of A = {a}i + {b}j + {c}k onto B = {d}i + {e}j + {f}k.',
      'Determine if lines L1: r = {a}i + t({b}i + {c}j) and L2: r = {d}j + s({e}i + {f}j) intersect.',
      'Find the shortest distance between the skew lines with given direction vectors.',
    ],
  },
  calculus: {
    easy: [],
    medium: [
      'Differentiate f(x) = x^{a} + {b}x^{c} - {d} with respect to x.',
      'Find the integral of f(x) = {a}x^{b} + {c}cos(x) dx.',
      'Evaluate the limit: lim(x→{a}) (x² - {b}x + {c}) / (x - {a})',
    ],
    hard: [
      'Find the area enclosed between y = x² and y = {a}x + {b} using definite integration.',
      'Apply chain rule to differentiate f(x) = sin({a}x² + {b}x).',
      'Using integration by parts, evaluate ∫x^{a} · e^x dx.',
      'Find the maximum and minimum values of f(x) = x³ - {a}x² + {b}x - {c}.',
      'Evaluate the improper integral ∫₀^∞ e^(-{a}x) dx.',
    ],
  },
  trigonometry: {
    easy: [],
    medium: [
      'Find the value of sin({a}°) + cos({b}°) - tan({c}°) exactly.',
      'Prove or evaluate: sin²θ + cos²θ = ?',
      'If sin A = {a}/{b}, find cos A and tan A.',
    ],
    hard: [
      'Solve for x in [0, 2π]: {a}sin²x + {b}sinx + {c} = 0.',
      'Find all solutions of cos({a}x) = sin({b}x) in [0°, 360°].',
      'Prove the identity: tan(A + B) = (tanA + tanB)/(1 - tanA·tanB).',
    ],
  },
  probability: {
    easy: [
      'A fair die is rolled. What is the probability of getting a number greater than {a}?',
      'A bag has {a} red, {b} blue, {c} green balls. What is the probability of drawing a red ball?',
      'Two fair coins are tossed. What is the probability of getting at least one head?',
    ],
    medium: [
      'If P(A) = {a}, P(B) = {b}, and A, B are independent, find P(A ∪ B).',
      'From a deck of 52 cards, what is the probability of drawing a {a}?',
      'A box has {a} defective and {b} non-defective items. If {c} are drawn, find the probability that all are defective.',
    ],
    hard: [
      'Using Bayes theorem, find P(A|B) given P(B|A) = {a}, P(A) = {b}, P(B) = {c}.',
      'In a Binomial distribution with n = {a} and p = {b}, find the mean and variance.',
      'If X follows Poisson distribution with λ = {a}, find P(X ≤ {b}).',
    ],
  },
  pnc: {
    easy: [],
    medium: [
      'In how many ways can {a} people be arranged in a row?',
      'How many {a}-letter words can be formed from the letters of the word "{word}"?',
      'Find the number of ways to choose {a} items from {b} distinct items.',
      'In how many ways can a committee of {a} be chosen from {b} men and {c} women?',
    ],
    hard: [],
  },
  aptitude: {
    easy: [],
    medium: [
      'A train travels {a} km in {b} hours. What is its speed in km/h?',
      'If {a}% of a number is {b}, what is the number?',
      'A can do a job in {a} days. B can do it in {b} days. Together, how long will they take?',
      'Find the next term in the series: {a}, {b}, {c}, {d}, ?',
      'A shopkeeper marks a price {a}% above cost and gives {b}% discount. Find profit %.',
      'The average of {a} numbers is {b}. If one number is removed, average becomes {c}. Find the removed number.',
      'In a mixture of {a} liters, the ratio of milk to water is {b}:{c}. Find the quantity of milk.',
      'Simple interest on Rs.{a} for {b} years at {c}% per annum is?',
    ],
    hard: [
      'Two pipes A and B can fill a tank in {a} and {b} hours. C can empty in {c} hours. All open, time to fill?',
      'A boat goes {a} km upstream and {b} km downstream in {c} hours. Speed of stream is {d} km/h. Find boat speed.',
      'In a group of {a} people, {b} speak English and {c} speak Hindi. {d} speak both. How many speak only one language?',
      'A number when divided by {a} leaves remainder {b}, when divided by {c} leaves {d}. Find smallest such number.',
    ],
  },
  english: {
    easy: [],
    medium: [
      'Choose the correct meaning of the idiom: "To bite the bullet."',
      'Select the grammatically correct sentence from the options below.',
      'Choose the word closest in meaning to "Meticulous".',
      'Fill in the blank: "She has been working here ___ five years." (Choose the correct preposition)',
      'Identify the error in the sentence: "He don\'t know the answer."',
      'Choose the antonym of "Benevolent".',
      'Choose the word that best completes the analogy: "Doctor : Patient :: Teacher : ___"',
    ],
    hard: [
      'In the following passage, identify the tone of the author: [passage about environmental conservation].',
      'Rearrange the following sentences to form a coherent paragraph: [S1] [S2] [S3] [S4].',
      'Identify the rhetorical device used in the sentence: "The pen is mightier than the sword."',
      'Choose the sentence that correctly uses the subjunctive mood.',
    ],
  },
  cprog: {
    easy: [],
    medium: [
      'What is the output of the following C code?\n```c\nint main() { int x = {a}; printf("%d", x++ + ++x); }\n```',
      'What is the size of int data type on a 32-bit system in C?',
      'Which of the following correctly declares a pointer to an integer in C?',
      'What does `sizeof(int *)` return on a 64-bit system?',
      'What is the output?\n```c\nint a[] = {{{a},{b},{c}}}; printf("%d", a[1]);\n```',
      'What is the result of `5 & 3` in C?',
      'Which storage class retains its value between function calls?',
      'What will be printed?\n```c\nfor(int i=0; i<{a}; i++) printf("%d ", i*i);\n```',
    ],
    hard: [],
  },
};

function getTemplate(topic, difficulty, index) {
  const templates = QUESTION_TEMPLATES[topic]?.[difficulty] || [];
  if (templates.length === 0) return null;
  const tmpl = templates[index % templates.length];
  const vals = { a: (index%9)+1, b: (index%7)+2, c: (index%5)+1, d: (index%6)+2, e: (index%4)+1, f: (index%3)+2, word: 'MATHEMATICS' };
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => vals[k] || k);
}

function makeOptions(qBody, correct) {
  // Generic plausible-looking options
  return {
    option_a: correct,
    option_b: `Alternative answer B for: ${qBody.slice(0, 30)}`,
    option_c: `Alternative answer C for: ${qBody.slice(0, 30)}`,
    option_d: `Alternative answer D for: ${qBody.slice(0, 30)}`,
    correct_opt: 'a',
  };
}

async function seed() {
  const client = await pool.connect();
  let totalInserted = 0;

  try {
    console.log('🌱 Starting question seed...\n');

    // Clear existing questions for exam 1 (fresh seed)
    const existing = await client.query('SELECT COUNT(*) FROM questions WHERE exam_id = $1', [EXAM_ID]);
    const existingCount = parseInt(existing.rows[0].count);
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing questions. Deleting to re-seed...`);
      await client.query('DELETE FROM questions WHERE exam_id = $1', [EXAM_ID]);
    }

    for (const [topicKey, easyCount, medCount, hardCount] of PLAN) {
      const topic = TOPICS[topicKey];
      const batches = [['easy', easyCount], ['medium', medCount], ['hard', hardCount]];

      for (const [diff, count] of batches) {
        if (count === 0) continue;
        let inserted = 0;

        for (let i = 0; i < count; i++) {
          const rawBody = getTemplate(topicKey, diff, i);
          const body = rawBody
            ? rawBody
            : `[${topic.name}] Sample ${diff} question #${i + 1}`;

          const correctAnswer = `Correct answer for ${topic.name} ${diff} Q${i + 1}`;
          const opts = makeOptions(body, correctAnswer);

          await client.query(
            `INSERT INTO questions
              (exam_id, topic_id, difficulty, body, option_a, option_b, option_c, option_d, correct_opt, explanation, is_deleted)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)`,
            [
              EXAM_ID, topic.id, diff, body,
              opts.option_a, opts.option_b, opts.option_c, opts.option_d,
              opts.correct_opt,
              `Explanation for ${topic.name} ${diff} Q${i + 1}: The correct answer is option A.`,
            ]
          );
          inserted++;
          totalInserted++;
        }
        console.log(`  ✅ ${topic.name} (${diff}): ${inserted} questions`);
      }
    }

    console.log(`\n🎉 Done! Total questions seeded: ${totalInserted}`);

    // Verify counts
    const verify = await client.query(
      `SELECT t.name AS topic, q.difficulty, COUNT(*) AS count
       FROM questions q JOIN topics t ON t.id = q.topic_id
       WHERE q.exam_id = $1
       GROUP BY t.name, q.difficulty ORDER BY t.name, q.difficulty`,
      [EXAM_ID]
    );
    console.log('\n📊 Verification breakdown:');
    let total = 0;
    for (const r of verify.rows) {
      console.log(`   ${r.topic.padEnd(22)} ${r.difficulty.padEnd(8)} → ${r.count}`);
      total += parseInt(r.count);
    }
    console.log(`   ${'TOTAL'.padEnd(30)} → ${total}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error('❌ Seed failed:', err.message); process.exit(1); });
