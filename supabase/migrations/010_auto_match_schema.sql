-- ============================================
-- SPRINT 4: Auto-Match System Schema
-- Migration: 010_auto_match_schema.sql
-- Description: Tables for auto-match chat system
-- ============================================

-- Auto-match log table (track auto-match events)
CREATE TABLE IF NOT EXISTS auto_match_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE NOT NULL,
  matched_user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE NOT NULL,
  compatibility_score DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_auto_match UNIQUE(user_id, matched_user_id, created_at)
);

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID REFERENCES user_profile(user_id) ON DELETE CASCADE NOT NULL,
  user_b UUID REFERENCES user_profile(user_id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'auto_match', 'group'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_conversation UNIQUE(user_a, user_b)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_message (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES chat_conversation(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE NOT NULL,
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'auto_match_intro', 'system'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function to calculate distance (used in auto-match)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  location1 GEOGRAPHY,
  location2 GEOGRAPHY
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(location1, location2) / 1000.0; -- Convert meters to km
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enable RLS on new tables
ALTER TABLE auto_match_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Auto-match log policies
CREATE POLICY "Users can view own auto-match logs"
  ON auto_match_log
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

CREATE POLICY "System can create auto-match logs"
  ON auto_match_log
  FOR INSERT
  WITH CHECK (true);

-- Chat conversation policies
CREATE POLICY "Users can view own conversations"
  ON chat_conversation
  FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create conversations with others"
  ON chat_conversation
  FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can update own conversations"
  ON chat_conversation
  FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Chat message policies
CREATE POLICY "Users can view messages in their conversations"
  ON chat_message
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversation
      WHERE id = chat_message.conversation_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON chat_message
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversation
      WHERE id = chat_message.conversation_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_message
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_auto_match_log_user
  ON auto_match_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_users
  ON chat_conversation(user_a, user_b);

CREATE INDEX IF NOT EXISTS idx_chat_message_conversation
  ON chat_message(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_sender
  ON chat_message(sender_id, created_at DESC);

-- ============================================
-- MISSING COLUMNS (if not already added)
-- ============================================

-- Add auto_match_enabled to user_profile (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'auto_match_enabled'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN auto_match_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add dismissed column to recommendation table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recommendation' AND column_name = 'dismissed'
  ) THEN
    ALTER TABLE recommendation ADD COLUMN dismissed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add expires_at to discovery_event (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discovery_event' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE discovery_event ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Sprint 4 Auto-Match Schema Migration Complete';
  RAISE NOTICE 'Tables: auto_match_log, chat_conversation, chat_message';
  RAISE NOTICE 'Function: calculate_distance_km';
  RAISE NOTICE 'RLS policies enabled on all tables';
END $$;
