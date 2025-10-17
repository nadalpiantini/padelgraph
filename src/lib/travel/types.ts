// Travel Mode Types

export type TravelPlanStatus = 'active' | 'completed' | 'cancelled';

export type TravelLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type TravelFormat = 'singles' | 'doubles' | 'any';

export interface TravelPreferences {
  level?: TravelLevel;
  format?: TravelFormat;
  [key: string]: unknown;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  destination_city: string;
  destination_country?: string;
  location?: {
    lat: number;
    lng: number;
  };
  start_date: string; // ISO date
  end_date: string; // ISO date
  preferences?: TravelPreferences;
  status: TravelPlanStatus;
  created_at: string;
}

export interface TravelSuggestion {
  id: string;
  type: 'club' | 'tournament' | 'player';
  name: string;
  distance_km?: number;
  address?: string;
  rating?: number;
  available_times?: string[];
}

export interface CreateTravelPlanRequest {
  destination_city: string;
  destination_country?: string;
  start_date: string;
  end_date: string;
  preferences?: TravelPreferences;
}

export interface UpdateTravelPlanRequest extends Partial<CreateTravelPlanRequest> {
  status?: TravelPlanStatus;
}
