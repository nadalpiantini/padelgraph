/**
 * Tournament Engine Core Types
 *
 * Type definitions for tournament algorithms, matches, and standings calculations.
 */

export interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  status: 'registered' | 'checked_in' | 'no_show' | 'withdrawn';
}

export interface Match {
  id?: string;
  round_id: string;
  court_id?: string;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_score?: number;
  team2_score?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'forfeited';
  winner_team?: 1 | 2;
  is_draw: boolean;
}

export interface Standing {
  tournament_id: string;
  user_id: string;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  games_won: number;
  games_lost: number;
  games_diff: number;
  points: number;
  rank?: number;
  // Sprint 3: Fair-play fields
  fair_play_points: number;
  yellow_cards: number;
  red_cards: number;
  conduct_bonus: number;
}

export interface Court {
  id: string;
  name: string;
  org_id: string;
  status: string;
}

export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
  status: 'pending' | 'in_progress' | 'completed';
  starts_at?: Date;
  ends_at?: Date;
}

export interface MatchWithCourt extends Match {
  court: Court;
}

export interface TournamentConfig {
  type: 'americano' | 'mexicano' | 'round_robin' | 'knockout_single' | 'knockout_double' | 'swiss' | 'monrad' | 'compass';
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  match_duration_minutes: number;
  format_settings?: TournamentFormatSettings;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Pairing strategy for organizing matches
 */
export type PairingStrategy = 'round-robin' | 'winners-losers' | 'swiss';

/**
 * Court rotation strategy
 */
export type CourtRotationStrategy = 'balanced' | 'sequential' | 'random';

// ============================================================================
// Sprint 3: Advanced Tournament Format Types
// ============================================================================

/**
 * Tournament bracket entry for knockout-style tournaments
 */
export interface TournamentBracket {
  id: string;
  tournament_id: string;
  bracket_type: 'main' | 'consolation' | 'losers' | 'third_place';
  round_number: number;
  position: number;
  match_id?: string;
  winner_from_match_id?: string;
  loser_from_match_id?: string;
  created_at: Date;
}

/**
 * Tournament group for round robin tournaments
 */
export interface TournamentGroup {
  id: string;
  tournament_id: string;
  group_name: string;
  group_number: number;
  participant_ids: string[];
  top_advance: number;
  created_at: Date;
}

/**
 * Fair-play incident tracking
 */
export interface TournamentFairPlay {
  id: string;
  tournament_id: string;
  user_id: string;
  match_id?: string;
  incident_type: 'yellow_card' | 'red_card' | 'code_violation' | 'time_violation' | 'unsportsmanlike_conduct' | 'equipment_abuse' | 'positive_conduct';
  description?: string;
  severity: 1 | 2 | 3 | 4 | 5;
  penalty_points: number;
  bonus_points: number;
  issued_by?: string;
  issued_at: Date;
  created_at: Date;
}

/**
 * Format-specific settings stored in tournament.format_settings
 */
export interface TournamentFormatSettings {
  // Round Robin settings
  groups?: number;
  top_per_group?: number;
  playoffs?: boolean;

  // Knockout settings
  seeding?: 'random' | 'ranked' | 'manual';
  seed_order?: string[];
  bronze_match?: boolean;

  // Swiss settings
  rounds?: number;
  pairing_method?: 'slide' | 'fold' | 'accelerated';

  // Monrad settings
  initial_rounds?: number;
  bracket_size?: number;

  // Compass settings
  consolation_levels?: number;
}

/**
 * Bracket round with matches
 */
export interface BracketRound {
  round_number: number;
  round_name: string;
  matches: Match[];
}

/**
 * Complete bracket structure
 */
export interface BracketStructure {
  bracket_type: 'main' | 'consolation' | 'losers';
  rounds: BracketRound[];
  progression_map: BracketProgression[];
}

/**
 * Bracket progression mapping
 */
export interface BracketProgression {
  match_id: string;
  winner_advances_to?: string;
  loser_advances_to?: string;
}

/**
 * Seeding configuration
 */
export interface SeedingConfig {
  strategy: 'random' | 'ranked' | 'manual';
  seed_order?: string[];
  bracket_size: number;
}

/**
 * Group stage configuration
 */
export interface GroupStageConfig {
  num_groups: number;
  top_per_group: number;
  include_playoffs: boolean;
}

/**
 * Swiss pairing result
 */
export interface SwissPairingResult {
  matches: Match[];
  byes: string[];
}
