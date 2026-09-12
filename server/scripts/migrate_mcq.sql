-- ============================================================
-- G-Prime MCQ Exam Platform - Migration Script
-- Database: mcq_exam_db
-- ============================================================

DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS candidate_questions CASCADE;
DROP TABLE IF EXISTS candidate_sessions CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS shift_questions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS weightage_rules CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS exam_config CASCADE;

-- ============================================================
-- EXAM CONFIGURATION
-- (one active exam at a time)
-- ============================================================
CREATE TABLE exam_config (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  total_duration_min  INT NOT NULL DEFAULT 60,    -- 60 minutes per shift
  grace_join_min      INT NOT NULL DEFAULT 15,    -- how long after start candidates can join
  questions_per_shift INT NOT NULL DEFAULT 75,
  is_active           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIFTS (dynamic — admin creates N shifts per exam)
-- ============================================================
CREATE TABLE shifts (
  id               SERIAL PRIMARY KEY,
  exam_id          INT NOT NULL REFERENCES exam_config(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,              -- "Shift 1", "Morning Batch", etc.
  scheduled_start  TIMESTAMPTZ,               -- planned start time (display only)
  is_active        BOOLEAN NOT NULL DEFAULT false,
  is_paused        BOOLEAN NOT NULL DEFAULT false,
  paused_at        TIMESTAMPTZ,
  extra_time_min   INT NOT NULL DEFAULT 0,    -- cumulative extra time added by admin
  started_at       TIMESTAMPTZ,               -- actual time admin clicked "Start"
  ended_at         TIMESTAMPTZ,
  paper_generated  BOOLEAN NOT NULL DEFAULT false,  -- locks paper after generation
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMINS (bcrypt hash + JWT)
-- ============================================================
CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- ============================================================
-- SYLLABUS STRUCTURE: Subject → Topic
-- Hierarchy used consistently in weightage, generator, and UI filters.
-- ============================================================
CREATE TABLE subjects (
  id       SERIAL PRIMARY KEY,
  exam_id  INT NOT NULL REFERENCES exam_config(id) ON DELETE CASCADE,
  name     TEXT NOT NULL              -- e.g. "Engineering Mathematics"
);

CREATE TABLE topics (
  id         SERIAL PRIMARY KEY,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL            -- e.g. "Calculus", "Linear Algebra", "Probability"
);

-- ============================================================
-- WEIGHTAGE RULES
-- Defines how many questions (easy/medium/hard) come from each topic.
-- Hierarchy: Subject → Topic → Difficulty
-- Sum of (easy_count + medium_count + hard_count) across ALL rules
-- for a given exam MUST equal questions_per_shift (75).
-- ============================================================
CREATE TABLE weightage_rules (
  id           SERIAL PRIMARY KEY,
  exam_id      INT NOT NULL REFERENCES exam_config(id) ON DELETE CASCADE,
  topic_id     INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  easy_count   INT NOT NULL DEFAULT 0,
  medium_count INT NOT NULL DEFAULT 0,
  hard_count   INT NOT NULL DEFAULT 0,
  UNIQUE(exam_id, topic_id)
);

-- ============================================================
-- QUESTION BANK (~300 questions per exam)
-- Hierarchy: questions.topic_id → topics.subject_id → subjects.exam_id
-- ============================================================
CREATE TABLE questions (
  id           SERIAL PRIMARY KEY,
  exam_id      INT NOT NULL REFERENCES exam_config(id) ON DELETE CASCADE,
  topic_id     INT NOT NULL REFERENCES topics(id),
  difficulty   TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),

  -- Question body: plain text or LaTeX (KaTeX syntax).
  body         TEXT NOT NULL,

  -- Options: same format — can contain LaTeX expressions
  option_a     TEXT NOT NULL,
  option_b     TEXT NOT NULL,
  option_c     TEXT NOT NULL,
  option_d     TEXT NOT NULL,

  correct_opt  CHAR(1) NOT NULL CHECK(correct_opt IN ('a','b','c','d')),
  explanation  TEXT,                    -- shown post-submission (optional)

  -- Optional image: stored as relative file path or base64 data URI
  image_url    TEXT,

  is_deleted   BOOLEAN NOT NULL DEFAULT false,    -- soft delete
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIFT PAPERS (pre-generated: which questions belong to which shift)
-- UNIQUE(question_id) enforces that each question appears in at most
-- one shift across the entire exam.
-- ============================================================
CREATE TABLE shift_questions (
  id           SERIAL PRIMARY KEY,
  shift_id     INT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  question_id  INT NOT NULL REFERENCES questions(id),
  UNIQUE(shift_id, question_id),
  UNIQUE(question_id)    -- global: no question repeats across shifts
);

-- ============================================================
-- CANDIDATES (replaces legacy users table)
-- ============================================================
CREATE TABLE candidates (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  roll_no          TEXT NOT NULL UNIQUE,
  branch           TEXT NOT NULL,        -- e.g. "CSE", "ECE"
  section          TEXT NOT NULL,        -- e.g. "A", "B"
  email            TEXT NOT NULL,
  token            TEXT NOT NULL UNIQUE, -- format: BRANCH-SECTION-ROLLNO4-RANDOM6

  -- Shift assignment: set at token generation; locked after first use
  shift_id         INT NOT NULL REFERENCES shifts(id),

  -- Token lifecycle tracking
  token_used       BOOLEAN NOT NULL DEFAULT false,
  used_in_shift_id INT REFERENCES shifts(id),  -- confirmed at join time

  -- Session versioning (force-logout on new device)
  session_version  INT NOT NULL DEFAULT 1,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CANDIDATE EXAM SESSIONS
-- Timer fields follow tab-visibility pause / snapshot mechanics.
-- ============================================================
CREATE TABLE candidate_sessions (
  id                 SERIAL PRIMARY KEY,
  candidate_id       INT NOT NULL REFERENCES candidates(id),
  shift_id           INT NOT NULL REFERENCES shifts(id),
  socket_id          TEXT,                    -- updated on reconnect

  join_time          TIMESTAMPTZ DEFAULT NOW(),
  end_time           TIMESTAMPTZ NOT NULL,    -- join_time + 60min + extra_time

  -- Timer state
  active_seconds     INT NOT NULL DEFAULT 0,  -- cumulative time with tab active
  time_remaining_sec INT,                     -- snapshot at tab_inactive / admin pause
  last_active_at     TIMESTAMPTZ,
  tab_is_active      BOOLEAN NOT NULL DEFAULT true,

  -- Session lifecycle
  is_submitted       BOOLEAN NOT NULL DEFAULT false,
  submitted_at       TIMESTAMPTZ,

  -- Admin override (session reopen)
  admin_reopened     BOOLEAN NOT NULL DEFAULT false,
  admin_reopen_at    TIMESTAMPTZ,

  score              INT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CANDIDATE QUESTION ASSIGNMENTS (shuffled uniquely at join time)
-- Each candidate gets the 75 shift questions in a random order.
-- ============================================================
CREATE TABLE candidate_questions (
  id            SERIAL PRIMARY KEY,
  candidate_id  INT NOT NULL REFERENCES candidates(id),
  question_id   INT NOT NULL REFERENCES questions(id),
  position      INT NOT NULL,            -- displayed position 1–75 (unique to this candidate)
  selected_opt  CHAR(1) CHECK(selected_opt IN ('a','b','c','d')),
  is_marked     BOOLEAN NOT NULL DEFAULT false,   -- "Mark for Review"
  answered_at   TIMESTAMPTZ,
  UNIQUE(candidate_id, question_id),
  UNIQUE(candidate_id, position)
);

-- ============================================================
-- RESULTS (computed on submit; synced to Supabase post-exam)
-- ============================================================
CREATE TABLE results (
  id               SERIAL PRIMARY KEY,
  candidate_id     INT NOT NULL REFERENCES candidates(id),
  shift_id         INT NOT NULL REFERENCES shifts(id),
  score            INT NOT NULL,
  total_questions  INT NOT NULL DEFAULT 75,
  correct_count    INT NOT NULL,
  wrong_count      INT NOT NULL,
  skipped_count    INT NOT NULL,
  time_taken_sec   INT NOT NULL,          -- active_seconds at submit time
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  synced_to_cloud  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(candidate_id, shift_id)
);

-- ============================================================
-- SEED INITIAL ADMIN ACCOUNT
-- Username: admin
-- Password: admin123 (bcrypt hash)
-- ============================================================
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$10$L6WLXfty0ECYV1dI3Yy8WehxZplRcV47u048iAHQuQIIzQBQC2Lgm')
ON CONFLICT (username) DO NOTHING;
