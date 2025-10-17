'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User, Building, Calendar, SlidersHorizontal, X } from 'lucide-react';
import type {
  DiscoveryType,
  DiscoveryPlayer,
  DiscoveryClub,
  DiscoveryMatch,
  DiscoveryFilters,
  PlayerLevel,
} from '@/lib/discovery/types';

interface DiscoveryMapProps {
  mapboxToken: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  t: {
    loading: string;
    filters: string;
    showPlayers: string;
    showClubs: string;
    showMatches: string;
    radius: string;
    level: string;
    minRating: string;
    availableOnly: string;
    apply: string;
    reset: string;
    noLocation: string;
    player: string;
    club: string;
    match: string;
    distance: string;
    rating: string;
    courts: string;
    liveNow: string;
    upcoming: string;
  };
}

export default function DiscoveryMap({
  mapboxToken,
  initialCenter = [-3.7038, 40.4168], // Madrid default
  initialZoom = 12,
  t,
}: DiscoveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<DiscoveryFilters>({
    type: ['players', 'clubs', 'matches'],
    radius_km: 10,
    available_only: false,
  });

  const [discoveryData, setDiscoveryData] = useState<{
    players: DiscoveryPlayer[];
    clubs: DiscoveryClub[];
    matches: DiscoveryMatch[];
  }>({
    players: [],
    clubs: [],
    matches: [],
  });

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Get user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(coords);

          // Add user marker
          if (map.current) {
            new mapboxgl.Marker({ color: '#6366f1' })
              .setLngLat(coords)
              .setPopup(new mapboxgl.Popup().setHTML('<p>You are here</p>'))
              .addTo(map.current);

            map.current.flyTo({ center: coords, zoom: 13 });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }

    setIsLoading(false);

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, initialCenter, initialZoom]);

  // Load discovery data
  useEffect(() => {
    if (!userLocation) return;

    loadDiscoveryData();
  }, [userLocation, filters]);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add player markers
    if (filters.type.includes('players')) {
      discoveryData.players.forEach((player) => {
        const el = createMarkerElement('player');
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([player.location.lng, player.location.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              createPlayerPopup(player)
            )
          )
          .addTo(map.current!);
        markers.current.push(marker);
      });
    }

    // Add club markers
    if (filters.type.includes('clubs')) {
      discoveryData.clubs.forEach((club) => {
        const el = createMarkerElement('club');
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([club.location.lng, club.location.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              createClubPopup(club)
            )
          )
          .addTo(map.current!);
        markers.current.push(marker);
      });
    }

    // Add match markers
    if (filters.type.includes('matches')) {
      discoveryData.matches.forEach((match) => {
        const el = createMarkerElement(match.status === 'live' ? 'match-live' : 'match');
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([match.location.lng, match.location.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              createMatchPopup(match)
            )
          )
          .addTo(map.current!);
        markers.current.push(marker);
      });
    }
  }, [discoveryData, filters.type]);

  const loadDiscoveryData = async () => {
    if (!userLocation) return;

    try {
      const params = new URLSearchParams({
        type: filters.type.join(','),
        radius: filters.radius_km?.toString() || '10',
        ...(filters.level && { level: filters.level }),
        ...(filters.min_rating && { min_rating: filters.min_rating.toString() }),
        ...(filters.available_only && { available_only: 'true' }),
      });

      const response = await fetch(`/api/discover/nearby?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDiscoveryData({
          players: data.players || [],
          clubs: data.clubs || [],
          matches: data.matches || [],
        });
      }
    } catch (error) {
      console.error('Error loading discovery data:', error);
    }
  };

  const createMarkerElement = (type: string): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'discovery-marker';

    const colors = {
      player: 'bg-blue-500',
      club: 'bg-green-500',
      match: 'bg-amber-500',
      'match-live': 'bg-red-500 animate-pulse',
    };

    el.innerHTML = `<div class="w-8 h-8 ${colors[type as keyof typeof colors] || 'bg-gray-500'} rounded-full border-2 border-white shadow-lg flex items-center justify-center"></div>`;
    return el;
  };

  const createPlayerPopup = (player: DiscoveryPlayer): string => {
    return `
      <div class="p-2">
        <h3 class="font-semibold text-white mb-1">${player.name}</h3>
        <p class="text-sm text-slate-300 capitalize">${player.level}</p>
        ${player.rating ? `<p class="text-sm text-amber-400">⭐ ${player.rating.toFixed(1)}</p>` : ''}
        ${player.distance_km ? `<p class="text-xs text-slate-400 mt-1">${player.distance_km.toFixed(1)} km ${t.distance}</p>` : ''}
        ${player.available ? `<p class="text-xs text-green-400 mt-1">✓ ${t.availableOnly}</p>` : ''}
      </div>
    `;
  };

  const createClubPopup = (club: DiscoveryClub): string => {
    return `
      <div class="p-2">
        <h3 class="font-semibold text-white mb-1">${club.name}</h3>
        <p class="text-sm text-slate-300">${club.address}</p>
        ${club.courts_count ? `<p class="text-sm text-slate-400">${club.courts_count} ${t.courts}</p>` : ''}
        ${club.rating ? `<p class="text-sm text-amber-400">⭐ ${club.rating.toFixed(1)}</p>` : ''}
        ${club.distance_km ? `<p class="text-xs text-slate-400 mt-1">${club.distance_km.toFixed(1)} km ${t.distance}</p>` : ''}
      </div>
    `;
  };

  const createMatchPopup = (match: DiscoveryMatch): string => {
    return `
      <div class="p-2">
        <h3 class="font-semibold text-white mb-1">${match.title}</h3>
        ${match.club_name ? `<p class="text-sm text-slate-300">${match.club_name}</p>` : ''}
        <p class="text-sm text-slate-400 capitalize">${match.level} • ${match.format}</p>
        <p class="text-sm ${match.status === 'live' ? 'text-red-400' : 'text-amber-400'} font-medium mt-1">
          ${match.status === 'live' ? `🔴 ${t.liveNow}` : `⏰ ${t.upcoming}`}
        </p>
        <p class="text-xs text-slate-400 mt-1">${match.players_current}/${match.players_current + match.players_needed} players</p>
        ${match.distance_km ? `<p class="text-xs text-slate-400 mt-1">${match.distance_km.toFixed(1)} km ${t.distance}</p>` : ''}
      </div>
    `;
  };

  const handleTypeToggle = (type: DiscoveryType) => {
    setFilters((prev) => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter((t) => t !== type)
        : [...prev.type, type],
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      type: ['players', 'clubs', 'matches'],
      radius_km: 10,
      available_only: false,
    });
  };

  if (!mapboxToken) {
    return (
      <div className="w-full h-[600px] bg-slate-900 rounded-xl flex items-center justify-center">
        <p className="text-slate-400">Mapbox token required</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">{t.loading}</p>
          </div>
        </div>
      )}

      {/* Filters Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-4 left-4 z-20 px-4 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t.filters}
      </button>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-4 left-4 z-30 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">{t.filters}</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Type Filters */}
          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.type.includes('players')}
                onChange={() => handleTypeToggle('players')}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">{t.showPlayers}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.type.includes('clubs')}
                onChange={() => handleTypeToggle('clubs')}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <Building className="w-4 h-4 text-green-400" />
              <span className="text-slate-300">{t.showClubs}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.type.includes('matches')}
                onChange={() => handleTypeToggle('matches')}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">{t.showMatches}</span>
            </label>
          </div>

          {/* Radius */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t.radius}: {filters.radius_km} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={filters.radius_km || 10}
              onChange={(e) =>
                setFilters({ ...filters, radius_km: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>

          {/* Level Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t.level}
            </label>
            <select
              value={filters.level || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  level: e.target.value as PlayerLevel | undefined,
                })
              }
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          {/* Available Only */}
          <label className="flex items-center gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={filters.available_only || false}
              onChange={(e) =>
                setFilters({ ...filters, available_only: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-slate-300">{t.availableOnly}</span>
          </label>

          {/* Actions */}
          <button
            onClick={handleResetFilters}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            {t.reset}
          </button>
        </div>
      )}

      {/* Stats Counter */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-800/90 border border-slate-600 rounded-lg px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          {filters.type.includes('players') && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-white font-medium">{discoveryData.players.length}</span>
            </div>
          )}
          {filters.type.includes('clubs') && (
            <div className="flex items-center gap-1">
              <Building className="w-4 h-4 text-green-400" />
              <span className="text-white font-medium">{discoveryData.clubs.length}</span>
            </div>
          )}
          {filters.type.includes('matches') && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-white font-medium">{discoveryData.matches.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
