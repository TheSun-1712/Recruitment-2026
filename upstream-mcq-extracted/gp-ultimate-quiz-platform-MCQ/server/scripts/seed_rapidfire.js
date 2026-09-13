
const { Pool } = require('pg');

// Configuration from load-balancer/config.js
const PG_CONFIG = {
    user: 'postgres',
    host: '127.0.0.1',
    database: 'contest_db',
    password: 'password',
    port: 5432,
};

const pool = new Pool(PG_CONFIG);

const QUESTIONS = [
    {
        title: "Sum of Two Numbers",
        description: "Write a program that takes two integers as input and prints their sum.",
        avg_time: 180,
        testCases: [
            { input: "3\n5", expected_output: "8" },
            { input: "10\n20", expected_output: "30" },
            { input: "-5\n5", expected_output: "0" }
        ]
    },
    {
        title: "Check Even or Odd",
        description: "Write a program that takes an integer as input and prints 'Even' if it is even, and 'Odd' if it is odd.",
        avg_time: 180,
        testCases: [
            { input: "2", expected_output: "Even" },
            { input: "3", expected_output: "Odd" },
            { input: "0", expected_output: "Even" }
        ]
    },
    {
        title: "Factorial of a Number",
        description: "Write a program to find the factorial of a given number N.",
        avg_time: 180,
        testCases: [
            { input: "5", expected_output: "120" },
            { input: "3", expected_output: "6" },
            { input: "0", expected_output: "1" }
        ]
    },
    {
        title: "Reverse a String",
        description: "Write a program that takes a string as input and prints its reverse.",
        avg_time: 180,
        testCases: [
            { input: "hello", expected_output: "olleh" },
            { input: "world", expected_output: "dlrow" },
            { input: "12345", expected_output: "54321" }
        ]
    },
    {
        title: "Find Maximum of Three",
        description: "Write a program that takes three integers as input and prints the largest one.",
        avg_time: 180,
        testCases: [
            { input: "1\n5\n3", expected_output: "5" },
            { input: "10\n2\n8", expected_output: "10" },
            { input: "-1\n-5\n-3", expected_output: "-1" }
        ]
    },
    {
        title: "Check Prime Number",
        description: "Write a program to check if a given number N is prime. Print 'Yes' if prime, 'No' otherwise.",
        avg_time: 180,
        testCases: [
            { input: "7", expected_output: "Yes" },
            { input: "10", expected_output: "No" },
            { input: "1", expected_output: "No" }
        ]
    },
    {
        title: "Fibonacci Sequence",
        description: "Write a program to print the Nth number in the Fibonacci sequence (0-indexed). F(0)=0, F(1)=1.",
        avg_time: 180,
        testCases: [
            { input: "0", expected_output: "0" },
            { input: "5", expected_output: "5" },
            { input: "10", expected_output: "55" }
        ]
    },
    {
        title: "Count Vowels",
        description: "Write a program to count the number of vowels (a, e, i, o, u) in a given string (case insensitive).",
        avg_time: 180,
        testCases: [
            { input: "hello", expected_output: "2" },
            { input: "Apple", expected_output: "2" },
            { input: "sky", expected_output: "0" }
        ]
    },
    {
        title: "Palindrome Check",
        description: "Write a program to check if a given string is a palindrome. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "madam", expected_output: "Yes" },
            { input: "hello", expected_output: "No" },
            { input: "racecar", expected_output: "Yes" }
        ]
    },
    {
        title: "Sum of Array Arguments",
        description: "Given N, followed by N integers, print their sum.",
        avg_time: 180,
        testCases: [
            { input: "3\n1\n2\n3", expected_output: "6" },
            { input: "2\n10\n20", expected_output: "30" },
            { input: "1\n5", expected_output: "5" }
        ]
    },
    {
        title: "Find Minimum Element",
        description: "Given N, followed by N integers. Print the minimum element.",
        avg_time: 180,
        testCases: [
            { input: "3\n5\n1\n9", expected_output: "1" },
            { input: "2\n10\n20", expected_output: "10" },
            { input: "1\n5", expected_output: "5" }
        ]
    },
    {
        title: "Square Check",
        description: "Check if a given number is a perfect square. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "4", expected_output: "Yes" },
            { input: "5", expected_output: "No" },
            { input: "16", expected_output: "Yes" }
        ]
    },
    {
        title: "Simple Interest",
        description: "Calculate Simple Interest given multiple lines: Principal, Rate, Time. Print floor value.",
        avg_time: 180,
        testCases: [
            { input: "1000\n5\n2", expected_output: "100" },
            { input: "5000\n10\n1", expected_output: "500" },
            { input: "200\n2\n2", expected_output: "8" }
        ]
    },
    {
        title: "Print 1 to N",
        description: "Print numbers from 1 to N separated by space.",
        avg_time: 180,
        testCases: [
            { input: "5", expected_output: "1 2 3 4 5" },
            { input: "1", expected_output: "1" },
            { input: "3", expected_output: "1 2 3" }
        ]
    },
    {
        title: "Leap Year",
        description: "Check if a year is a leap year. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "2020", expected_output: "Yes" },
            { input: "2021", expected_output: "No" },
            { input: "2000", expected_output: "Yes" }
        ]
    },
    {
        title: "Celsius to Fahrenheit",
        description: "Convert Celsius to Fahrenheit. Formula: (C * 9/5) + 32. Print integer part.",
        avg_time: 180,
        testCases: [
            { input: "0", expected_output: "32" },
            { input: "100", expected_output: "212" },
            { input: "-40", expected_output: "-40" }
        ]
    },
    {
        title: "Power of Two",
        description: "Check if a number is a power of two. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "8", expected_output: "Yes" },
            { input: "6", expected_output: "No" },
            { input: "1", expected_output: "Yes" }
        ]
    },
    {
        title: "Multiple of 5",
        description: "Check if a number is a multiple of 5. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "10", expected_output: "Yes" },
            { input: "11", expected_output: "No" },
            { input: "55", expected_output: "Yes" }
        ]
    },
    {
        title: "Area of Rectangle",
        description: "Given length and width, print area.",
        avg_time: 180,
        testCases: [
            { input: "5\n4", expected_output: "20" },
            { input: "10\n10", expected_output: "100" },
            { input: "2\n3", expected_output: "6" }
        ]
    },
    {
        title: "Swap Two Numbers",
        description: "Given two numbers, print them in swapped order separated by a space.",
        avg_time: 180,
        testCases: [
            { input: "5\n10", expected_output: "10 5" },
            { input: "1\n2", expected_output: "2 1" },
            { input: "-5\n5", expected_output: "5 -5" }
        ]
    },
    {
        title: "Cube of Number",
        description: "Print the cube of a given number.",
        avg_time: 180,
        testCases: [
            { input: "3", expected_output: "27" },
            { input: "2", expected_output: "8" },
            { input: "1", expected_output: "1" }
        ]
    },
    {
        title: "Uppercase Conversion",
        description: "Convert a lowercase character to uppercase.",
        avg_time: 180,
        testCases: [
            { input: "a", expected_output: "A" },
            { input: "z", expected_output: "Z" },
            { input: "m", expected_output: "M" }
        ]
    },
    {
        title: "Check Positive Negative",
        description: "Check if a number is Positive, Negative or Zero.",
        avg_time: 180,
        testCases: [
            { input: "5", expected_output: "Positive" },
            { input: "-2", expected_output: "Negative" },
            { input: "0", expected_output: "Zero" }
        ]
    },
    {
        title: "Print ASCII Value",
        description: "Print the ASCII value of a given character.",
        avg_time: 180,
        testCases: [
            { input: "A", expected_output: "65" },
            { input: "a", expected_output: "97" },
            { input: "0", expected_output: "48" }
        ]
    },
    {
        title: "Sum of First N Numbers",
        description: "Print sum of first N natural numbers.",
        avg_time: 180,
        testCases: [
            { input: "5", expected_output: "15" },
            { input: "3", expected_output: "6" },
            { input: "10", expected_output: "55" }
        ]
    },
    {
        title: "Absolute Value",
        description: "Print the absolute value of an integer.",
        avg_time: 180,
        testCases: [
            { input: "-5", expected_output: "5" },
            { input: "10", expected_output: "10" },
            { input: "0", expected_output: "0" }
        ]
    },
    {
        title: "Check Alphabet",
        description: "Check if a character is an alphabet. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "a", expected_output: "Yes" },
            { input: "1", expected_output: "No" },
            { input: "$", expected_output: "No" }
        ]
    },
    {
        title: "Divisible by 3 and 5",
        description: "Check if a number is divisible by both 3 and 5. Print 'Yes' or 'No'.",
        avg_time: 180,
        testCases: [
            { input: "15", expected_output: "Yes" },
            { input: "10", expected_output: "No" },
            { input: "9", expected_output: "No" }
        ]
    },
    {
        title: "Last Digit",
        description: "Print the last digit of a number.",
        avg_time: 180,
        testCases: [
            { input: "123", expected_output: "3" },
            { input: "10", expected_output: "0" },
            { input: "5", expected_output: "5" }
        ]
    },
    {
        title: "Check Voting Age",
        description: "Given age, print 'Eligible' if age >= 18, else 'Not Eligible'.",
        avg_time: 180,
        testCases: [
            { input: "18", expected_output: "Eligible" },
            { input: "17", expected_output: "Not Eligible" },
            { input: "25", expected_output: "Eligible" }
        ]
    }
];

async function seed() {
    try {
        console.log("🌱 Connecting to DB...");
        await pool.query('SELECT NOW()');
        console.log("✅ Connected!");

        // 1. Clean up old data
        console.log("🗑️ Cleaning up old data...");
        // Order matters due to foreign keys
        // user_questions depends on questions
        // attempts depends on questions
        // test_cases depends on questions
        // submissions might theoretically refer to questions if schema changed, but usually no FK in sample
        await pool.query('DELETE FROM user_questions');
        await pool.query('DELETE FROM attempts');
        await pool.query('DELETE FROM test_cases');
        await pool.query('DELETE FROM questions');
        // We aren't deleting users or user_sessions to keep login valid if possible,
        // but user_questions and attempts are wiped, so session state is reset effectively.

        console.log("✨ Insert new questions...");

        for (const q of QUESTIONS) {
            const res = await pool.query(
                "INSERT INTO questions (title, description, avg_time) VALUES ($1, $2, $3) RETURNING id",
                [q.title, q.description, q.avg_time]
            );
            const questionId = res.rows[0].id;

            for (const tc of q.testCases) {
                await pool.query(
                    "INSERT INTO test_cases (problem_id, input, expected_output) VALUES ($1, $2, $3)",
                    [questionId, tc.input, tc.expected_output]
                );
            }
        }

        console.log(`✅ Seeded ${QUESTIONS.length} questions and their test cases.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed Failed:", err);
        process.exit(1);
    }
}

seed();
