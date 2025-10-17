/**
 * Database types generated from Supabase schema
 * Sprint 1: Core & Communication
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ============================================================================
// USER & PROFILE TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  level?: number;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  avatar_url?: string;
  bio?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  lang: 'en' | 'es';
  notifications: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    show_location: boolean;
    show_level: boolean;
    discoverable: boolean;
  };
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'club' | 'group' | 'federation';
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'coach' | 'member' | 'guest';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SOCIAL FEED TYPES
// ============================================================================

export type PostVisibility = 'public' | 'friends' | 'private' | 'org';

export interface Post {
  id: string;
  user_id: string;
  org_id?: string;
  content: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  visibility: PostVisibility;
  created_at: string;
  updated_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BOOKING SYSTEM TYPES
// ============================================================================

export type CourtType = 'indoor' | 'outdoor' | 'covered';
export type CourtSurface = 'carpet' | 'concrete' | 'grass' | 'crystal' | 'synthetic';

export interface Court {
  id: string;
  org_id: string;
  name: string;
  type: CourtType;
  surface: CourtSurface;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  court_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM:SS format
  end_time: string;
  price_per_hour: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  court_id: string;
  user_id: string;
  org_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  total_price: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ProfileUpdateRequest {
  name?: string;
  phone?: string;
  level?: number;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  bio?: string;
  avatar_url?: string;
}

export interface PreferencesUpdateRequest {
  lang?: 'en' | 'es';
  notifications?: Partial<UserPreferences['notifications']>;
  privacy?: Partial<UserPreferences['privacy']>;
}

export interface CreatePostRequest {
  content: string;
  media_urls?: string[];
  visibility?: PostVisibility;
  org_id?: string;
}

export interface CreateCommentRequest {
  post_id: string;
  content: string;
}

export interface CreateBookingRequest {
  court_id: string;
  start_at: string;
  end_at: string;
  notes?: string;
}

export interface CreateCourtRequest {
  org_id: string;
  name: string;
  type: CourtType;
  surface: CourtSurface;
  description?: string;
}

export interface CreateAvailabilityRequest {
  court_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_per_hour: number;
}

// ============================================================================
// TOURNAMENT SYSTEM TYPES (Sprint 2)
// ============================================================================

export type TournamentType = 'americano' | 'mexicano';
export type TournamentStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipantStatus = 'registered' | 'checked_in' | 'no_show' | 'withdrawn';
export type RoundStatus = 'pending' | 'in_progress' | 'completed';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'forfeited';

export interface TournamentSettings {
  auto_advance_rounds?: boolean;
  notify_participants?: boolean;
  allow_late_checkin?: boolean;
}

export interface Tournament {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  type: TournamentType;
  status: TournamentStatus;
  starts_at: string;
  ends_at?: string;
  check_in_opens_at?: string;
  check_in_closes_at?: string;
  max_participants: number;
  match_duration_minutes: number;
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  location_lat: number;
  location_lng: number;
  geofence_radius_meters: number;
  settings: TournamentSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  registered_at: string;
  status: ParticipantStatus;
  checked_in_at?: string;
  checked_in_lat?: number;
  checked_in_lng?: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentRound {
  id: string;
  tournament_id: string;
  round_number: number;
  status: RoundStatus;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentMatch {
  id: string;
  round_id: string;
  court_id?: string;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  team1_score?: number;
  team2_score?: number;
  status: MatchStatus;
  winner_team?: 1 | 2;
  is_draw: boolean;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentStanding {
  id: string;
  tournament_id: string;
  user_id: string;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  games_won: number;
  games_lost: number;
  games_diff: number; // Generated column
  points: number;
  rank?: number;
  updated_at: string;
}

// ============================================================================
// TOURNAMENT API REQUEST TYPES
// ============================================================================

export interface CreateTournamentRequest {
  org_id: string;
  name: string;
  description?: string;
  type: TournamentType;
  starts_at: string;
  max_participants: number;
  location_lat: number;
  location_lng: number;
  geofence_radius_meters?: number;
  match_duration_minutes?: number;
  points_per_win?: number;
  points_per_draw?: number;
  points_per_loss?: number;
  settings?: TournamentSettings;
  check_in_opens_at?: string;
  check_in_closes_at?: string;
}

export interface UpdateTournamentRequest {
  name?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  check_in_opens_at?: string;
  check_in_closes_at?: string;
  settings?: TournamentSettings;
}

export interface CheckInRequest {
  lat: number;
  lng: number;
}

export interface SubmitScoreRequest {
  team1_score: number;
  team2_score: number;
}

export interface TournamentFilters {
  org_id?: string;
  status?: TournamentStatus | TournamentStatus[];
  type?: TournamentType;
  starts_after?: string;
  starts_before?: string;
  nearby?: {
    lat: number;
    lng: number;
    radius_km: number;
  };
}

// ============================================================================
// TOURNAMENT RESPONSE TYPES
// ============================================================================

export interface TournamentWithDetails extends Tournament {
  participants: TournamentParticipantWithProfile[];
  current_round?: TournamentRoundWithMatches;
  standings: TournamentStandingWithProfile[];
  stats: {
    total_matches: number;
    completed_matches: number;
    progress_percentage: number;
  };
}

export interface TournamentParticipantWithProfile extends TournamentParticipant {
  profile: Pick<UserProfile, 'name' | 'avatar_url' | 'level'>;
}

export interface TournamentRoundWithMatches extends TournamentRound {
  matches: TournamentMatchWithDetails[];
}

export interface TournamentMatchWithDetails extends TournamentMatch {
  court?: Pick<Court, 'name' | 'type'>;
  team1_player1: Pick<UserProfile, 'name' | 'avatar_url'>;
  team1_player2: Pick<UserProfile, 'name' | 'avatar_url'>;
  team2_player1: Pick<UserProfile, 'name' | 'avatar_url'>;
  team2_player2: Pick<UserProfile, 'name' | 'avatar_url'>;
}

export interface TournamentStandingWithProfile extends TournamentStanding {
  profile: Pick<UserProfile, 'name' | 'avatar_url' | 'level'>;
}

export interface RotationBoardData {
  tournament: Tournament;
  round: TournamentRound;
  matches: Array<{
    court_id?: string;
    court_name?: string;
    match: TournamentMatchWithDetails;
  }>;
}

// ============================================================================
// DATABASE SCHEMA TYPE (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      user_profile: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> & {
          id: string;
        };
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      organization: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;
      };
      org_member: {
        Row: OrgMember;
        Insert: Omit<OrgMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OrgMember, 'id' | 'created_at' | 'updated_at'>>;
      };
      post: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'likes_count' | 'comments_count' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at'>>;
      };
      post_like: {
        Row: PostLike;
        Insert: Omit<PostLike, 'id' | 'created_at'>;
        Update: never;
      };
      post_comment: {
        Row: PostComment;
        Insert: Omit<PostComment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PostComment, 'id' | 'created_at' | 'updated_at'>>;
      };
      court: {
        Row: Court;
        Insert: Omit<Court, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Court, 'id' | 'created_at' | 'updated_at'>>;
      };
      availability: {
        Row: Availability;
        Insert: Omit<Availability, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Availability, 'id' | 'created_at' | 'updated_at'>>;
      };
      booking: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>;
      };
      tournament: {
        Row: Tournament;
        Insert: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Tournament, 'id' | 'created_at' | 'updated_at'>>;
      };
      tournament_participant: {
        Row: TournamentParticipant;
        Insert: Omit<TournamentParticipant, 'id' | 'registered_at' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TournamentParticipant, 'id' | 'created_at' | 'updated_at'>>;
      };
      tournament_round: {
        Row: TournamentRound;
        Insert: Omit<TournamentRound, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TournamentRound, 'id' | 'created_at' | 'updated_at'>>;
      };
      tournament_match: {
        Row: TournamentMatch;
        Insert: Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TournamentMatch, 'id' | 'created_at' | 'updated_at'>>;
      };
      tournament_standing: {
        Row: TournamentStanding;
        Insert: Omit<TournamentStanding, 'id' | 'updated_at' | 'games_diff'>;
        Update: Partial<Omit<TournamentStanding, 'id' | 'updated_at' | 'games_diff'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
