'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MatchSuggestions from '@/components/discovery/MatchSuggestions';
import SearchFilters, { type DiscoveryFilters } from '@/components/discovery/SearchFilters';
import DiscoveryFeed from '@/components/discovery/DiscoveryFeed';
import DiscoveryMap from '@/components/discovery/DiscoveryMap';
import NetworkGraph from '@/components/discovery/NetworkGraph';
import { Users, Map, Activity, Sparkles, Network } from 'lucide-react';

/**
 * DiscoverClient Component
 *
 * Main discovery interface with filtering, recommendations,
 * map view, and activity feed.
 */
export default function DiscoverClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const [activeTab, setActiveTab] = useState('matches');

  // Load filters from URL on mount
  useEffect(() => {
    const urlFilters: DiscoveryFilters = {};

    // Skill level
    const skillMin = searchParams.get('skill_min');
    const skillMax = searchParams.get('skill_max');
    if (skillMin || skillMax) {
      urlFilters.skillLevel = {};
      if (skillMin) urlFilters.skillLevel.min = parseInt(skillMin);
      if (skillMax) urlFilters.skillLevel.max = parseInt(skillMax);
    }

    // Location
    const city = searchParams.get('city');
    const radius = searchParams.get('radius');
    if (city) {
      urlFilters.location = {
        city,
        radius: radius ? parseInt(radius) : 20,
      };
    }

    // Preferred hand
    const hand = searchParams.get('hand');
    if (hand === 'left' || hand === 'right' || hand === 'both') {
      urlFilters.preferredHand = hand;
    }

    // Age range
    const ageMin = searchParams.get('age_min');
    const ageMax = searchParams.get('age_max');
    if (ageMin || ageMax) {
      urlFilters.ageRange = {};
      if (ageMin) urlFilters.ageRange.min = parseInt(ageMin);
      if (ageMax) urlFilters.ageRange.max = parseInt(ageMax);
    }

    setFilters(urlFilters);
  }, [searchParams]);

  // Update URL params when filters change
  const handleFilterChange = useCallback((newFilters: DiscoveryFilters) => {
    setFilters(newFilters);

    // Build URL params
    const params = new URLSearchParams();

    if (newFilters.skillLevel) {
      if (newFilters.skillLevel.min) params.set('skill_min', newFilters.skillLevel.min.toString());
      if (newFilters.skillLevel.max) params.set('skill_max', newFilters.skillLevel.max.toString());
    }

    if (newFilters.location) {
      if (newFilters.location.city) params.set('city', newFilters.location.city);
      if (newFilters.location.radius) params.set('radius', newFilters.location.radius.toString());
    }

    if (newFilters.preferredHand) {
      params.set('hand', newFilters.preferredHand);
    }

    if (newFilters.ageRange) {
      if (newFilters.ageRange.min) params.set('age_min', newFilters.ageRange.min.toString());
      if (newFilters.ageRange.max) params.set('age_max', newFilters.ageRange.max.toString());
    }

    // Update URL without page reload
    const newUrl = params.toString() ? `/discover?${params.toString()}` : '/discover';
    router.push(newUrl, { scroll: false });

    // Store in localStorage for persistence
    try {
      localStorage.setItem('discover_filters', JSON.stringify(newFilters));
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }, [router]);

  // Handle invite action
  const handleInvite = useCallback(async (userId: string) => {
    try {
      // TODO: Implement invite API call
      console.log('Invite user:', userId);
      // Example:
      // const response = await fetch('/api/invites', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ invited_user_id: userId }),
      // });
    } catch (error) {
      console.error('Failed to send invite:', error);
    }
  }, []);

  // Translations (hardcoded for now, should come from i18n)
  const t = {
    filters: {
      title: 'Search Filters',
      subtitle: 'Customize your discovery preferences',
      skillLevel: 'Skill Level',
      skillMin: 'Minimum',
      skillMax: 'Maximum',
      location: 'Location',
      city: 'City',
      cityPlaceholder: 'Select a city',
      radius: 'Distance',
      radiusKm: 'km',
      availability: 'Availability',
      dateFrom: 'From',
      dateTo: 'To',
      preferredHand: 'Preferred Hand',
      left: 'Left',
      right: 'Right',
      both: 'Both',
      ageRange: 'Age Range',
      ageMin: 'Min Age',
      ageMax: 'Max Age',
      applyFilters: 'Apply Filters',
      resetFilters: 'Reset',
      activeFilters: 'active',
      collapse: 'Collapse',
      expand: 'Expand',
    },
    matches: {
      title: 'Recommended Players',
      subtitle: 'Personalized matches based on your profile and preferences',
      loading: 'Finding your perfect match...',
      loadingMore: 'Loading more players...',
      noMatches: 'No matches found',
      matchScore: 'Match Score',
      skillLevel: 'Skill Level',
      invite: 'Invite to Play',
      invited: 'Invitation Sent',
      loadMore: 'Load More',
      compatible: 'Compatible',
      skillLevels: {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        expert: 'Expert',
      },
    },
    feed: {
      title: 'Discovery Feed',
      subtitle: 'See what\'s happening in your area',
      loading: 'Loading feed...',
      loadingMore: 'Loading more...',
      noEvents: 'No events found in your area',
      bookmark: 'Bookmark',
      like: 'Like',
      viewDetails: 'View Details',
      newPlayer: 'New Player',
      upcomingMatch: 'Upcoming Match',
      newTournament: 'New Tournament',
      playerAchievement: 'Achievement',
      clubEvent: 'Club Event',
      distanceAway: 'away',
      timeAgo: 'ago',
    },
    tabs: {
      matches: 'Player Matches',
      map: 'Map View',
      network: 'Network',
      feed: 'Activity Feed',
    },
    map: {
      loading: 'Loading map...',
      filters: 'Filters',
      showPlayers: 'Show Players',
      showClubs: 'Show Clubs',
      showMatches: 'Show Matches',
      radius: 'Radius',
      level: 'Level',
      minRating: 'Min Rating',
      availableOnly: 'Available Only',
      apply: 'Apply',
      reset: 'Reset',
      noLocation: 'Location not available',
      player: 'Player',
      club: 'Club',
      match: 'Match',
      distance: 'distance',
      rating: 'Rating',
      courts: 'courts',
      liveNow: 'Live Now',
      upcoming: 'Upcoming',
    },
    network: {
      loading: 'Loading network...',
      noData: 'No network data available',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      resetZoom: 'Reset Zoom',
      users: 'users',
      clubs: 'clubs',
      connections: 'connections',
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-400" />
          Discover Players
        </h1>
        <p className="text-slate-400 text-lg">
          Find your perfect padel partner and connect with the community
        </p>
      </div>

      {/* Search Filters */}
      <SearchFilters
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        t={t.filters}
      />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border border-slate-700 mb-6">
          <TabsTrigger
            value="matches"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            {t.tabs.matches}
          </TabsTrigger>
          <TabsTrigger
            value="map"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Map className="w-4 h-4 mr-2" />
            {t.tabs.map}
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Network className="w-4 h-4 mr-2" />
            {t.tabs.network}
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Activity className="w-4 h-4 mr-2" />
            {t.tabs.feed}
          </TabsTrigger>
        </TabsList>

        {/* Player Matches Tab */}
        <TabsContent value="matches" className="mt-0">
          <MatchSuggestions
            filters={filters}
            maxResults={30}
            onInvite={handleInvite}
            t={t.matches}
          />
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map" className="mt-0">
          {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
            <DiscoveryMap
              mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              t={t.map}
            />
          ) : (
            <div className="rounded-xl overflow-hidden border border-slate-700 h-[600px] bg-slate-900 flex items-center justify-center">
              <div className="text-center p-8">
                <Map className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">Map requires Mapbox token</p>
                <p className="text-slate-500 text-sm">
                  Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
                </p>
                <a
                  href="https://account.mapbox.com/access-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-sm underline mt-2 inline-block"
                >
                  Get free Mapbox token →
                </a>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Network Graph Tab */}
        <TabsContent value="network" className="mt-0">
          <NetworkGraph t={t.network} />
        </TabsContent>

        {/* Activity Feed Tab */}
        <TabsContent value="feed" className="mt-0">
          <DiscoveryFeed
            radius={filters.location?.radius || 20}
            t={t.feed}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
