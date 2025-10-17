// Test fixtures for users and connections
export const mockUsers = {
  user1: {
    id: 'test-user-1',
    email: 'user1@test.com',
    full_name: 'Test User 1',
    skill_level: 'intermediate' as const,
    city: 'Madrid',
    created_at: new Date('2025-01-01').toISOString(),
  },
  user2: {
    id: 'test-user-2',
    email: 'user2@test.com',
    full_name: 'Test User 2',
    skill_level: 'intermediate' as const,
    city: 'Madrid',
    created_at: new Date('2025-01-01').toISOString(),
  },
  user3: {
    id: 'test-user-3',
    email: 'user3@test.com',
    full_name: 'Test User 3',
    skill_level: 'advanced' as const,
    city: 'Barcelona',
    created_at: new Date('2025-01-01').toISOString(),
  },
  user4: {
    id: 'test-user-4',
    email: 'user4@test.com',
    full_name: 'Test User 4',
    skill_level: 'beginner' as const,
    city: 'Barcelona',
    created_at: new Date('2025-01-01').toISOString(),
  },
  user5: {
    id: 'test-user-5',
    email: 'user5@test.com',
    full_name: 'Test User 5',
    skill_level: 'intermediate' as const,
    city: 'Valencia',
    created_at: new Date('2025-01-01').toISOString(),
  },
} as const;

export const mockConnections = [
  { user_id: 'test-user-1', connection_id: 'test-user-2', status: 'accepted' },
  { user_id: 'test-user-2', connection_id: 'test-user-3', status: 'accepted' },
  { user_id: 'test-user-3', connection_id: 'test-user-4', status: 'accepted' },
  // user5 is isolated (no connections)
] as const;

export const mockTravelPlans = [
  {
    id: 'travel-1',
    user_id: 'test-user-1',
    destination_city: 'Barcelona',
    start_date: '2025-10-20',
    end_date: '2025-10-25',
    is_active: true,
  },
] as const;

export const mockPrivacySettings = {
  user1: {
    user_id: 'test-user-1',
    can_see_user_location: true,
    show_in_discovery_feed: true,
    auto_match_enabled: true,
  },
  user3_private: {
    user_id: 'test-user-3',
    can_see_user_location: false,
    show_in_discovery_feed: false,
    auto_match_enabled: false,
  },
} as const;
