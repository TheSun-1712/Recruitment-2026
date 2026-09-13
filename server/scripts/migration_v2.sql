-- Workstream A: Exam Config grading fields
ALTER TABLE exam_config
  ADD COLUMN IF NOT EXISTS pass_mark_pct  NUMERIC(5,2) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS grade_ranges   JSONB;

-- Workstream B: Shifts — access window + duration override
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS access_close_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_override_min  INT;

-- Workstream D: Results — computed scoring
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS percentage  NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS grade       TEXT,
  ADD COLUMN IF NOT EXISTS pass_fail   TEXT CHECK(pass_fail IN ('pass','fail'));

-- Workstream F: Drop global unique constraint on shift_questions
-- (per-shift uniqueness UNIQUE(shift_id, question_id) is retained)
ALTER TABLE shift_questions
  DROP CONSTRAINT IF EXISTS shift_questions_question_id_key;

-- Question bank scoring: each question can award its own marks and optionally
-- deduct marks for an incorrect answer. Existing questions remain 1 mark.
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS marks NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (marks > 0),
  ADD COLUMN IF NOT EXISTS negative_marks NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (negative_marks >= 0);

-- Persist the maximum available marks with a result so later edits to the
-- question bank cannot change historical score denominators.
ALTER TABLE candidate_sessions
  ALTER COLUMN score TYPE NUMERIC(10,2) USING score::NUMERIC;

ALTER TABLE results
  ALTER COLUMN score TYPE NUMERIC(10,2) USING score::NUMERIC,
  ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2);

UPDATE results
SET total_marks = total_questions
WHERE total_marks IS NULL;

-- Submission is idempotent: one result per candidate per shift. This backs
-- the ON CONFLICT (candidate_id, shift_id) clauses in the submit routes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'results'::regclass
      AND conname = 'results_candidate_id_shift_id_key'
  ) THEN
    ALTER TABLE results
      ADD CONSTRAINT results_candidate_id_shift_id_key UNIQUE (candidate_id, shift_id);
  END IF;
END $$;
