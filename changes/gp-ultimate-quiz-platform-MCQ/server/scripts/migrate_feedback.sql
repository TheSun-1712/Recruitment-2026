-- ============================================================
-- Migration: Feedback Form Feature
-- Run once against the contest_db database
-- ============================================================

-- App-wide key–value config store (used for feedback_mode toggle)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Seed the feedback_mode key (OFF by default)
INSERT INTO app_settings (key, value)
VALUES ('feedback_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Feedback responses from event participants
CREATE TABLE IF NOT EXISTS event_feedback (
  id                SERIAL PRIMARY KEY,
  team_name         TEXT NOT NULL,
  participant_name  TEXT NOT NULL,
  institution       TEXT NOT NULL,
  q_event_flow      TEXT NOT NULL,
  q_hospitality     TEXT NOT NULL,
  q_fav_part        TEXT,                    -- optional, may be NULL
  q_overall_rating  INTEGER NOT NULL CHECK (q_overall_rating BETWEEN 1 AND 5),
  q_suggestions     TEXT NOT NULL,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_name)  -- one feedback submission per team
);
