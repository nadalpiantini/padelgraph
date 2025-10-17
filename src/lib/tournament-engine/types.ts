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
  type: 'americano' | 'mexicano';
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  match_duration_minutes: number;
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
