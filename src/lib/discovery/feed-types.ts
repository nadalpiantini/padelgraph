// Discovery Feed Types

export type DiscoveryEventType =
  | 'new_player'
  | 'upcoming_match'
  | 'new_tournament'
  | 'player_achievement'
  | 'club_event';

export interface DiscoveryEvent {
  id: string;
  event_type: DiscoveryEventType;
  entity_id: string;
  location?: {
    lat: number;
    lng: number;
  };
  visibility: 'public' | 'friends' | 'clubs';
  metadata: {
    title: string;
    description: string;
    image_url?: string;
    datetime?: string;
    location_name?: string;
    distance_km?: number;
    user_name?: string;
    user_avatar?: string;
    level?: string;
    format?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface DiscoveryFeedResponse {
  events: DiscoveryEvent[];
  has_more: boolean;
  next_cursor?: string;
}

export interface DiscoveryFeedRequest {
  location?: { lat: number; lng: number };
  radius?: number;
  event_types?: DiscoveryEventType[];
  limit?: number;
  cursor?: string;
}
