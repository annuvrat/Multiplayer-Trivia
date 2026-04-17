-- Core persistent tables for QuizArena
-- Uses UUID primary keys and is safe to rerun.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT,
  question_count INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_room_id ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at);
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
