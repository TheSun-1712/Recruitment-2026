-- Migration: Add disqualification_log table
CREATE TABLE IF NOT EXISTS disqualification_log (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255),
    round VARCHAR(100),
    violations INTEGER,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disq_log_reported ON disqualification_log (reported_at DESC);
