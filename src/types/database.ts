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
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
