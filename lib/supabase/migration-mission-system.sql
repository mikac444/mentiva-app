-- Mission System Migration
-- Run this in Supabase SQL Editor

-- 1. North Stars table
CREATE TABLE IF NOT EXISTS north_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_text TEXT NOT NULL,
  source_board_id UUID REFERENCES vision_boards(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_north_star_active
  ON north_stars(user_id) WHERE is_active = true;

ALTER TABLE north_stars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own north stars" ON north_stars
  FOR ALL USING (auth.uid() = user_id);

-- 2. Enfoques table
CREATE TABLE IF NOT EXISTS enfoques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  north_star_id UUID REFERENCES north_stars(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name, week_start)
);

CREATE INDEX IF NOT EXISTS idx_enfoques_user_week ON enfoques(user_id, week_start);

ALTER TABLE enfoques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own enfoques" ON enfoques
  FOR ALL USING (auth.uid() = user_id);

-- 3. Streaks table
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  non_negotiable_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id, date DESC);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own streaks" ON streaks
  FOR ALL USING (auth.uid() = user_id);

-- 4. Add mission columns to daily_tasks
ALTER TABLE daily_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'secondary',
  ADD COLUMN IF NOT EXISTS enfoque_name TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_tasks_task_type_check'
  ) THEN
    ALTER TABLE daily_tasks ADD CONSTRAINT daily_tasks_task_type_check
      CHECK (task_type IN ('non_negotiable', 'secondary', 'micro'));
  END IF;
END $$;
