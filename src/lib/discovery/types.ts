// Discovery Types

export type DiscoveryType = 'players' | 'clubs' | 'matches';
export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface DiscoveryLocation {
  lat: number;
  lng: number;
}

export interface DiscoveryPlayer {
  id: string;
  name: string;
  level: PlayerLevel;
  rating?: number;
  location: DiscoveryLocation;
  distance_km?: number;
  available?: boolean;
  avatar_url?: string;
}

export interface DiscoveryClub {
  id: string;
  name: string;
  address: string;
  location: DiscoveryLocation;
  distance_km?: number;
  courts_count?: number;
  rating?: number;
  amenities?: string[];
}

export interface DiscoveryMatch {
  id: string;
  title: string;
  location: DiscoveryLocation;
  club_name?: string;
  distance_km?: number;
  datetime: string;
  level: PlayerLevel;
  format: 'singles' | 'doubles';
  players_current: number;
  players_needed: number;
  status: 'live' | 'upcoming' | 'completed';
}

export type DiscoveryItem = DiscoveryPlayer | DiscoveryClub | DiscoveryMatch;

export interface DiscoveryFilters {
  type: DiscoveryType[];
  level?: PlayerLevel;
  radius_km?: number;
  min_rating?: number;
  available_only?: boolean;
}

export interface DiscoveryNearbyRequest {
  type?: DiscoveryType;
  radius?: number;
  level?: PlayerLevel;
  min_rating?: number;
  available_only?: boolean;
}

export interface DiscoveryNearbyResponse {
  players?: DiscoveryPlayer[];
  clubs?: DiscoveryClub[];
  matches?: DiscoveryMatch[];
  user_location: DiscoveryLocation;
}
