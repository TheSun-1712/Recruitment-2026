-- ============================================================
-- G-Prime Question Upload Portal — Supabase Cloud Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Cloud subjects table
CREATE TABLE IF NOT EXISTS cloud_subjects (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cloud topics table  
CREATE TABLE IF NOT EXISTS cloud_topics (
  id         SERIAL PRIMARY KEY,
  subject_id INT NOT NULL REFERENCES cloud_subjects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

-- Cloud questions staging table
CREATE TABLE IF NOT EXISTS cloud_questions (
  id              SERIAL PRIMARY KEY,
  subject_id      INT NOT NULL REFERENCES cloud_subjects(id),
  topic_id        INT NOT NULL REFERENCES cloud_topics(id),
  body            TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT NOT NULL,
  option_d        TEXT NOT NULL,
  correct_opt     CHAR(1) NOT NULL CHECK(correct_opt IN ('a','b','c','d')),
  difficulty      TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
  explanation     TEXT,
  image_url       TEXT,
  opt_a_image_url TEXT,
  opt_b_image_url TEXT,
  opt_c_image_url TEXT,
  opt_d_image_url TEXT,
  synced_to_local BOOLEAN NOT NULL DEFAULT false,
  created_by      TEXT DEFAULT 'admin',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED: Pre-defined subjects and topics
-- ============================================================
INSERT INTO cloud_subjects (name) VALUES
  ('Mathematics'),('English'),('C Programming'),('Aptitude'),('Reasoning')
ON CONFLICT (name) DO NOTHING;

INSERT INTO cloud_topics (subject_id, name)
SELECT id, unnest(ARRAY['Algebra','Calculus','Trigonometry','Statistics & Probability','Number Theory','Geometry','Matrices & Determinants'])
FROM cloud_subjects WHERE name = 'Mathematics' ON CONFLICT DO NOTHING;

INSERT INTO cloud_topics (subject_id, name)
SELECT id, unnest(ARRAY['Grammar','Vocabulary','Reading Comprehension','Error Detection','Fill in the Blanks','Sentence Rearrangement','Synonyms & Antonyms'])
FROM cloud_subjects WHERE name = 'English' ON CONFLICT DO NOTHING;

INSERT INTO cloud_topics (subject_id, name)
SELECT id, unnest(ARRAY['Basics & Syntax','Pointers','Arrays & Strings','Functions & Recursion','Structures & Unions','File I/O','Dynamic Memory','Preprocessor'])
FROM cloud_subjects WHERE name = 'C Programming' ON CONFLICT DO NOTHING;

INSERT INTO cloud_topics (subject_id, name)
SELECT id, unnest(ARRAY['Time & Work','Speed, Distance & Time','Percentages','Profit & Loss','Ratios & Proportions','Simple & Compound Interest','Averages','Mixtures & Allegations'])
FROM cloud_subjects WHERE name = 'Aptitude' ON CONFLICT DO NOTHING;

INSERT INTO cloud_topics (subject_id, name)
SELECT id, unnest(ARRAY['Logical Reasoning','Verbal Reasoning','Non-Verbal Reasoning','Puzzles & Seating Arrangement','Series & Patterns','Blood Relations','Direction Sense','Coding & Decoding'])
FROM cloud_subjects WHERE name = 'Reasoning' ON CONFLICT DO NOTHING;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE cloud_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subjects" ON cloud_subjects FOR SELECT USING (true);
CREATE POLICY "Public read topics" ON cloud_topics FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON cloud_questions FOR SELECT USING (true);
CREATE POLICY "Service insert subjects" ON cloud_subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert topics" ON cloud_topics FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert questions" ON cloud_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update questions" ON cloud_questions FOR UPDATE USING (true);
CREATE POLICY "Service delete questions" ON cloud_questions FOR DELETE USING (true);
