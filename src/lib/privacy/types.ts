// Privacy Settings Types

export type VisibilityLevel = 'public' | 'friends' | 'clubs_only' | 'private';

export interface PrivacySettings {
  user_id: string;
  location_visibility: VisibilityLevel;
  profile_visibility: VisibilityLevel;
  auto_match_enabled: boolean;
  show_in_discovery: boolean;
  graph_visibility: VisibilityLevel;
  updated_at: string;
}

export interface PrivacyAuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PrivacyPreview {
  profile_visible: boolean;
  location_visible: boolean;
  graph_visible: boolean;
  discovery_visible: boolean;
  auto_match_eligible: boolean;
}

export interface UpdatePrivacySettingsRequest {
  location_visibility?: VisibilityLevel;
  profile_visibility?: VisibilityLevel;
  auto_match_enabled?: boolean;
  show_in_discovery?: boolean;
  graph_visibility?: VisibilityLevel;
}
