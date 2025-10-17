-- Sprint 5: Analytics & Gamification Database Schema
-- Part 1: Player stats, achievements, leaderboards

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Player Statistics (aggregated)
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,

  -- Time period
  period_type VARCHAR(20) NOT NULL, -- day, week, month, all_time
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Match stats
  total_matches INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),

  -- Game stats
  total_games_won INTEGER DEFAULT 0,
  total_games_lost INTEGER DEFAULT 0,
  games_diff INTEGER,
  avg_score_per_match DECIMAL(4,1),

  -- Streaks
  current_win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,

  -- Tournament stats
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  avg_tournament_placement DECIMAL(4,1),

  -- Skill evolution
  elo_rating INTEGER DEFAULT 1200,
  elo_change INTEGER,
  skill_level VARCHAR(20),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_start)
);

-- Achievements
CREATE TABLE achievement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- participation, victory, social, travel, consistency, skill, community
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  xp_points INTEGER DEFAULT 0,
  badge_icon VARCHAR(100),
  badge_color VARCHAR(20),
  is_hidden BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE user_achievement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievement(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Leaderboards (precalculated)
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  scope_id UUID,
  metric VARCHAR(50) NOT NULL,
  period_type VARCHAR(20) DEFAULT 'all_time',
  period_start DATE,
  period_end DATE,
  rankings JSONB NOT NULL, -- [{user_id, rank, value, username, avatar}]
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, scope_id, metric, period_type, period_start)
);

-- Indexes for Phase 1
CREATE INDEX idx_player_stats_user ON player_stats(user_id);
CREATE INDEX idx_player_stats_period ON player_stats(period_type, period_start);
CREATE INDEX idx_achievement_category ON achievement(category);
CREATE INDEX idx_achievement_slug ON achievement(slug);
CREATE INDEX idx_user_achievement_user ON user_achievement(user_id);
CREATE INDEX idx_user_achievement_unlocked ON user_achievement(is_unlocked);
CREATE INDEX idx_leaderboard_type ON leaderboard(type, scope_id);
CREATE INDEX idx_leaderboard_period ON leaderboard(period_type, period_start);

-- Extend user_profile for gamification
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_plan VARCHAR(50) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"marketing": true, "digest": true, "achievements": true}'::jsonb;

-- RLS Policies for Phase 1
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievement ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- player_stats policies
CREATE POLICY "Users can view their own stats"
  ON player_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public stats"
  ON player_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = player_stats.user_id
      AND user_profile.is_public = true
    )
  );

-- achievement policies
CREATE POLICY "Everyone can view active achievements"
  ON achievement FOR SELECT
  USING (is_active = true AND is_hidden = false);

CREATE POLICY "Admins can manage achievements"
  ON achievement FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = auth.uid()
      AND user_profile.role = 'admin'
    )
  );

-- user_achievement policies
CREATE POLICY "Users can view their achievements"
  ON user_achievement FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public achievements"
  ON user_achievement FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = user_achievement.user_id
      AND user_profile.is_public = true
    )
  );

-- leaderboard policies
CREATE POLICY "Everyone can view leaderboards"
  ON leaderboard FOR SELECT
  USING (true);
