-- User profiles: stores structured data from onboarding conversation
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,

  -- Identity layer
  journey_stage TEXT NOT NULL DEFAULT 'exploring',
  core_values TEXT[] DEFAULT '{}',
  motivations TEXT[] DEFAULT '{}',
  fears TEXT[] DEFAULT '{}',
  self_narrative TEXT,
  definition_of_success TEXT,

  -- Practical layer
  life_stage TEXT,
  commitments TEXT[] DEFAULT '{}',
  energy_pattern TEXT DEFAULT 'variable',
  available_hours_per_day NUMERIC,

  -- Communication layer
  preferred_tone TEXT DEFAULT 'warm',
  processing_style TEXT DEFAULT 'written',
  accountability_style TEXT DEFAULT 'gentle_reminders',

  -- Onboarding data
  onboarding_conversation JSONB DEFAULT '[]',
  onboarding_completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- System Instruction Profiles: the generated Claude system prompt per user
CREATE TABLE IF NOT EXISTS system_instruction_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  generated_from JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sip_active
  ON system_instruction_profiles(user_id, is_active)
  WHERE is_active = true;

-- Add vision_type to existing vision_boards table
ALTER TABLE vision_boards ADD COLUMN IF NOT EXISTS vision_type TEXT DEFAULT 'board_upload';
