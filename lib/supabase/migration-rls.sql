-- ============================================================
-- Mentiva: Row Level Security (RLS) Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Safe to run multiple times (uses DROP IF EXISTS + CREATE).
--
-- IMPORTANT: service_role key (used by API routes via
-- getAdminSupabase()) bypasses RLS entirely, so server-side
-- operations continue working unchanged.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. user_profiles (CRITICAL — personal values, fears, onboarding)
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 2. vision_boards (CRITICAL — personal images + AI analysis)
-- ────────────────────────────────────────────────────────────
ALTER TABLE vision_boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own vision boards" ON vision_boards;
CREATE POLICY "Users can manage their own vision boards"
  ON vision_boards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. chat_conversations (conversation threads)
-- ────────────────────────────────────────────────────────────
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own conversations" ON chat_conversations;
CREATE POLICY "Users can manage their own conversations"
  ON chat_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. chat_messages (message content)
-- ────────────────────────────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own messages" ON chat_messages;
CREATE POLICY "Users can manage their own messages"
  ON chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. system_instruction_profiles (AI system prompts)
-- ────────────────────────────────────────────────────────────
ALTER TABLE system_instruction_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own system profiles" ON system_instruction_profiles;
CREATE POLICY "Users can manage their own system profiles"
  ON system_instruction_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. daily_tasks (missions and tasks)
-- ────────────────────────────────────────────────────────────
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON daily_tasks;
CREATE POLICY "Users can manage their own tasks"
  ON daily_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 7. journal_entries (personal journal)
-- ────────────────────────────────────────────────────────────
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own journal entries" ON journal_entries;
CREATE POLICY "Users can manage their own journal entries"
  ON journal_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 8. user_focus_areas (commitment areas)
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_focus_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own focus areas" ON user_focus_areas;
CREATE POLICY "Users can manage their own focus areas"
  ON user_focus_areas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 9. weekly_plans (weekly focus plans)
-- ────────────────────────────────────────────────────────────
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own weekly plans" ON weekly_plans;
CREATE POLICY "Users can manage their own weekly plans"
  ON weekly_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 10. allowed_emails (email allowlist — no user_id column)
-- ────────────────────────────────────────────────────────────
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read allowed emails" ON allowed_emails;
CREATE POLICY "Authenticated users can read allowed emails"
  ON allowed_emails FOR SELECT
  USING (auth.role() = 'authenticated');

-- ────────────────────────────────────────────────────────────
-- 11. referrals (referral tracking — no user_id column)
-- ────────────────────────────────────────────────────────────
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read referrals" ON referrals;
CREATE POLICY "Authenticated users can read referrals"
  ON referrals FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- DONE! All 11 tables now have RLS enabled.
-- Safe to run again — won't fail on duplicates.
-- ============================================================
