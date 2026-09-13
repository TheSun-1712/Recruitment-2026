-- Cascade questions backup generated on 2026-03-16T19:35:29.460Z
-- Re-run this file AFTER fetch_questions.js to restore cascade rows.

-- ============================================================
-- QUESTIONS (round = 'cascade')
-- ============================================================
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Friendly Numbers',
  '

&nbsp;

**Time limit per test:** 1 second &nbsp;&nbsp; **Memory limit per test:** 256 megabytes

For an integer **x**, we call another integer **y** **friendly** if the following condition holds:

**y − d(y) = x**

where **d(y)** represents the **sum of the digits of y**.

Given an integer **x**, your task is to determine **how many friendly numbers it has**.

&nbsp;

<h2><strong>Input</strong></h2>

&nbsp;

The first line contains an integer **t** — the number of test cases.

Each of the next **t** lines contains a single integer:

```
x
```

**Constraints**

- **1 ≤ t ≤ 500**
- **1 ≤ x ≤ 10⁹**

&nbsp;

<h2><strong>Output</strong></h2>

&nbsp;

For each test case, print a single integer representing the **number of friendly numbers** corresponding to **x**.

&nbsp;

<h2><strong>Example</strong></h2>

&nbsp;

<div style="display:flex; gap:16px; margin-top:8px;">

<div style="flex:1;">

**Input**

```
3
1
18
998244360
```

</div>

<div style="flex:1;">

**Output**

```
0
10
10
```

</div>

</div>

&nbsp;

<h2><strong>Note</strong></h2>

&nbsp;

- The number **1** does not have any friendly numbers.

- The number **18** has **10** friendly numbers. These are all the numbers from **20** to **29**.  
  For example:

```
20 − d(20) = 20 − 2 = 18
```

- The number **998244360** has **10** friendly numbers:

```
998244400
998244401
998244402
998244403
998244404
998244405
998244406
998244407
998244408
998244409
```',
  180,
  'cascade',
  10,
  1,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Spreadsheet Coordinates',
  '
&nbsp;

**Time limit per test:** **1 second** &nbsp;&nbsp; **Memory limit per test:** **256 megabytes**

In popular spreadsheet systems (such as Excel), columns are labeled using letters.

- The first column is labeled **A**
- The second column is labeled **B**
- ...
- The **26th** column is labeled **Z**

After that, two-letter labels are used:

- Column **27** → **AA**
- Column **28** → **AB**
- Column **52** → **AZ**

After **ZZ**, three-letter labels follow, and so on.

Rows are labeled using **integer numbers starting from 1**.

A cell name is formed by **concatenating the column label and the row number**.

Example:

```
BC23
```

This represents the cell located at:

- Column **55**
- Row **23**

There is also another notation system:

```
RXCY
```

Where:

- **X** represents the **row number**
- **Y** represents the **column number**

For example:

```
R23C55
```

represents the same cell as **BC23**.

Your task is to convert each coordinate into the **other notation system**.

&nbsp;

<h2><strong>Input</strong></h2>

&nbsp;

The first line contains an integer:

```
n
```

representing the number of coordinates.

The next **n** lines each contain one coordinate.

All coordinates are valid. There are no cells with the **row or column numbers larger than 10⁶**.

**Constraints**

- **1 ≤ n ≤ 100000**
- Row and column numbers are **≤ 10⁶**

&nbsp;

<h2><strong>Output</strong></h2>

&nbsp;

Print **n** lines.  
Each line should contain the cell coordinate written in the **other notation system**.

&nbsp;

<h2><strong>Example</strong></h2>

&nbsp;

<div style="display:flex; gap:16px; margin-top:8px;">

<div style="flex:1;">

**Input**

```
2
R23C55
BC23
```

</div>

<div style="flex:1;">

**Output**

```
BC23
R23C55
```

</div>

</div>',
  180,
  'cascade',
  10,
  2,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Factorial of a Number',
  'Write a program to find the factorial of a given number N.',
  180,
  'cascade',
  10,
  3,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Reverse a String',
  'Write a program that takes a string as input and prints its reverse.',
  180,
  'cascade',
  10,
  4,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Find Maximum of Three',
  'Write a program that takes three integers as input and prints the largest one.',
  180,
  'cascade',
  10,
  5,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Check Prime Number',
  'Write a program to check if a given number N is prime. Print ''Yes'' if prime, ''No'' otherwise.',
  180,
  'cascade',
  10,
  6,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Fibonacci Sequence',
  'Write a program to print the Nth number in the Fibonacci sequence (0-indexed). F(0)=0, F(1)=1.',
  180,
  'cascade',
  10,
  7,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Count Vowels',
  'Write a program to count the number of vowels (a, e, i, o, u) in a given string (case insensitive).',
  180,
  'cascade',
  10,
  8,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Palindrome Check',
  'Write a program to check if a given string is a palindrome. Print ''Yes'' or ''No''.',
  180,
  'cascade',
  10,
  9,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Sum of Array Arguments',
  'Given N, followed by N integers, print their sum.',
  180,
  'cascade',
  10,
  10,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Find Minimum Element',
  'Given N, followed by N integers. Print the minimum element.',
  180,
  'cascade',
  10,
  11,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Square Check',
  'Check if a given number is a perfect square. Print ''Yes'' or ''No''.',
  180,
  'cascade',
  10,
  12,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Simple Interest',
  'Calculate Simple Interest given multiple lines: Principal, Rate, Time. Print floor value.',
  180,
  'cascade',
  10,
  13,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Print 1 to N',
  'Print numbers from 1 to N separated by space.',
  180,
  'cascade',
  10,
  14,
  NULL
);
INSERT INTO questions (title, description, avg_time, round, base_points, sequence_order, time_limit)
VALUES (
  'Leap Year',
  'Check if a year is a leap year. Print ''Yes'' or ''No''.',
  180,
  'cascade',
  10,
  15,
  NULL
);

-- ============================================================
-- TEST CASES for cascade questions (problem_id resolved by title)
-- ============================================================
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Friendly Numbers' AND round = 'cascade' LIMIT 1),
  '3
5',
  '8',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Friendly Numbers' AND round = 'cascade' LIMIT 1),
  '10
20',
  '30',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Friendly Numbers' AND round = 'cascade' LIMIT 1),
  '-5
5',
  '0',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Spreadsheet Coordinates' AND round = 'cascade' LIMIT 1),
  '2',
  'Even',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Spreadsheet Coordinates' AND round = 'cascade' LIMIT 1),
  '3',
  'Odd',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Spreadsheet Coordinates' AND round = 'cascade' LIMIT 1),
  '0',
  'Even',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Factorial of a Number' AND round = 'cascade' LIMIT 1),
  '5',
  '120',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Factorial of a Number' AND round = 'cascade' LIMIT 1),
  '3',
  '6',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Factorial of a Number' AND round = 'cascade' LIMIT 1),
  '0',
  '1',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Reverse a String' AND round = 'cascade' LIMIT 1),
  'hello',
  'olleh',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Reverse a String' AND round = 'cascade' LIMIT 1),
  'world',
  'dlrow',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Reverse a String' AND round = 'cascade' LIMIT 1),
  '12345',
  '54321',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Find Maximum of Three' AND round = 'cascade' LIMIT 1),
  '1
5
3',
  '5',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Find Maximum of Three' AND round = 'cascade' LIMIT 1),
  '10
2
8',
  '10',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Find Maximum of Three' AND round = 'cascade' LIMIT 1),
  '-1
-5
-3',
  '-1',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Check Prime Number' AND round = 'cascade' LIMIT 1),
  '7',
  'Yes',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Check Prime Number' AND round = 'cascade' LIMIT 1),
  '10',
  'No',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Check Prime Number' AND round = 'cascade' LIMIT 1),
  '1',
  'No',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Fibonacci Sequence' AND round = 'cascade' LIMIT 1),
  '0',
  '0',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Fibonacci Sequence' AND round = 'cascade' LIMIT 1),
  '5',
  '5',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Fibonacci Sequence' AND round = 'cascade' LIMIT 1),
  '10',
  '55',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Count Vowels' AND round = 'cascade' LIMIT 1),
  'hello',
  '2',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Count Vowels' AND round = 'cascade' LIMIT 1),
  'Apple',
  '2',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Count Vowels' AND round = 'cascade' LIMIT 1),
  'sky',
  '0',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Palindrome Check' AND round = 'cascade' LIMIT 1),
  'madam',
  'Yes',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Palindrome Check' AND round = 'cascade' LIMIT 1),
  'hello',
  'No',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Palindrome Check' AND round = 'cascade' LIMIT 1),
  'racecar',
  'Yes',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Sum of Array Arguments' AND round = 'cascade' LIMIT 1),
  '3
1
2
3',
  '6',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Sum of Array Arguments' AND round = 'cascade' LIMIT 1),
  '2
10
20',
  '30',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Sum of Array Arguments' AND round = 'cascade' LIMIT 1),
  '1
5',
  '5',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Find Minimum Element' AND round = 'cascade' LIMIT 1),
  '3
5
1
9',
  '1',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Find Minimum Element' AND round = 'cascade' LIMIT 1),
  '2
10
20',
  '10',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Find Minimum Element' AND round = 'cascade' LIMIT 1),
  '1
5',
  '5',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Square Check' AND round = 'cascade' LIMIT 1),
  '4',
  'Yes',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Square Check' AND round = 'cascade' LIMIT 1),
  '5',
  'No',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Square Check' AND round = 'cascade' LIMIT 1),
  '16',
  'Yes',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Simple Interest' AND round = 'cascade' LIMIT 1),
  '1000
5
2',
  '100',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Simple Interest' AND round = 'cascade' LIMIT 1),
  '5000
10
1',
  '500',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Simple Interest' AND round = 'cascade' LIMIT 1),
  '200
2
2',
  '8',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Print 1 to N' AND round = 'cascade' LIMIT 1),
  '5',
  '1 2 3 4 5',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Print 1 to N' AND round = 'cascade' LIMIT 1),
  '1',
  '1',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Print 1 to N' AND round = 'cascade' LIMIT 1),
  '3',
  '1 2 3',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Leap Year' AND round = 'cascade' LIMIT 1),
  '2020',
  'Yes',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Leap Year' AND round = 'cascade' LIMIT 1),
  '2021',
  'No',
  true
);
INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
VALUES (
  (SELECT id FROM questions WHERE title = 'Leap Year' AND round = 'cascade' LIMIT 1),
  '2000',
  'Yes',
  true
);
