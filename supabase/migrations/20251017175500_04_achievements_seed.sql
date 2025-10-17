-- Sprint 5: Achievement Seed Data
-- 30+ predefined achievements across 7 categories

-- Participation Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('first-match', 'First Match', 'Play your first match', 'participation', 'match_count', 1, 10, '🎾', 'blue'),
('10-matches', '10 Matches', 'Complete 10 matches', 'participation', 'match_count', 10, 25, '🏅', 'blue'),
('50-matches', '50 Matches', 'Reach 50 matches milestone', 'participation', 'match_count', 50, 50, '⭐', 'blue'),
('100-matches', '100 Matches', 'Reach 100 matches milestone', 'participation', 'match_count', 100, 100, '💯', 'gold'),
('500-matches', 'Veteran Player', 'Complete 500 matches', 'participation', 'match_count', 500, 250, '👑', 'gold');

-- Victory Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('first-win', 'First Win', 'Win your first match', 'victory', 'wins_count', 1, 20, '🥇', 'yellow'),
('10-wins', '10 Wins', 'Achieve 10 victories', 'victory', 'wins_count', 10, 40, '🔟', 'yellow'),
('50-wins', '50 Wins', 'Reach 50 victories', 'victory', 'wins_count', 50, 75, '🏆', 'yellow'),
('100-wins', 'Elite Player', 'Elite player with 100 wins', 'victory', 'wins_count', 100, 150, '💪', 'gold'),
('win-streak-5', 'Win Streak 5', 'Win 5 matches in a row', 'victory', 'win_streak', 5, 50, '🔥', 'orange'),
('win-streak-10', 'Win Streak 10', 'Win 10 matches in a row', 'victory', 'win_streak', 10, 150, '⚡', 'red'),
('perfect-score', 'Perfect Victory', 'Win a match without losing a game', 'victory', 'perfect_match', 1, 100, '💎', 'purple');

-- Tournament Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('first-tournament', 'First Tournament', 'Join your first tournament', 'tournament', 'tournament_participations', 1, 30, '🎪', 'green'),
('tournament-winner', 'Tournament Winner', 'Win a tournament', 'tournament', 'tournament_wins', 1, 100, '👑', 'gold'),
('5-tournament-wins', '5 Tournament Wins', 'Win 5 tournaments', 'tournament', 'tournament_wins', 5, 250, '🏆', 'gold'),
('tournament-runner-up', 'Tournament Runner-Up', 'Finish 2nd in a tournament', 'tournament', 'tournament_runner_up', 1, 60, '🥈', 'silver'),
('tournament-bronze', 'Bronze Medalist', 'Finish 3rd in a tournament', 'tournament', 'tournament_bronze', 1, 40, '🥉', 'bronze');

-- Social Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('10-friends', '10 Friends', 'Add 10 friends', 'social', 'connections_count', 10, 20, '👥', 'blue'),
('50-connections', '50 Connections', 'Reach 50 connections', 'social', 'connections_count', 50, 50, '🌐', 'blue'),
('social-butterfly', 'Social Butterfly', 'Reach 100 connections', 'social', 'connections_count', 100, 100, '🦋', 'purple'),
('six-degrees-celebrity', 'Six Degrees Celebrity', 'Connect to a pro player', 'social', 'pro_connection', 1, 200, '⭐', 'gold');

-- Travel Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('first-travel', 'First Travel Mode', 'Activate travel mode', 'travel', 'travel_plans', 1, 30, '✈️', 'cyan'),
('5-cities', '5 Cities', 'Play in 5 different cities', 'travel', 'cities_visited', 5, 75, '🗺️', 'cyan'),
('international-player', 'International Player', 'Play in 3+ countries', 'travel', 'countries_visited', 3, 150, '🌍', 'green');

-- Consistency Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('7-day-streak', '7-Day Streak', 'Active for 7 consecutive days', 'consistency', 'activity_streak_days', 7, 50, '📅', 'orange'),
('30-day-streak', '30-Day Streak', 'Active for 30 consecutive days', 'consistency', 'activity_streak_days', 30, 200, '🔥', 'red'),
('1-year-active', '1 Year Active', 'Active for 1 year', 'consistency', 'days_active', 365, 500, '🎉', 'gold');

-- Skill Evolution Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('level-up', 'Level Up', 'Advance skill level', 'skill', 'skill_level_increase', 1, 30, '📈', 'green'),
('intermediate', 'Intermediate', 'Reach intermediate level', 'skill', 'skill_level_value', 3, 50, '🎓', 'blue'),
('advanced', 'Advanced', 'Reach advanced level', 'skill', 'skill_level_value', 4, 100, '🥋', 'purple'),
('pro', 'Pro', 'Reach pro level', 'skill', 'skill_level_value', 5, 250, '🏅', 'gold');

-- Community Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color) VALUES
('club-creator', 'Club Creator', 'Create a club', 'community', 'clubs_created', 1, 75, '🏢', 'purple'),
('tournament-host', 'Tournament Host', 'Host a tournament', 'community', 'tournaments_hosted', 1, 100, '🎯', 'orange'),
('fair-play-award', 'Fair-Play Award', 'Maintain positive conduct', 'community', 'fair_play_score', 100, 150, '🤝', 'green'),
('community-leader', 'Community Leader', 'Host 10+ tournaments', 'community', 'tournaments_hosted', 10, 500, '🌟', 'gold');

-- Hidden Special Achievements
INSERT INTO achievement (slug, name, description, category, requirement_type, requirement_value, xp_points, badge_icon, badge_color, is_hidden) VALUES
('comeback-king', 'Comeback King', 'Win after being down 0-3', 'victory', 'comeback_wins', 1, 200, '🎭', 'purple', true),
('perfect-season', 'Perfect Season', 'Win 10 matches without a loss', 'victory', 'perfect_streak', 10, 300, '💫', 'gold', true),
('globe-trotter', 'Globe Trotter', 'Play in 10+ countries', 'travel', 'countries_visited', 10, 500, '🌏', 'gold', true);
