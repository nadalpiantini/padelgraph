'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  User,
  Calendar,
  Trophy,
  Star,
  MapPin,
  Bookmark,
  Heart,
  Clock,
  Users,
} from 'lucide-react';
import type { DiscoveryEvent, DiscoveryEventType } from '@/lib/discovery/feed-types';

interface DiscoveryFeedProps {
  radius?: number;
  eventTypes?: DiscoveryEventType[];
  t: {
    title: string;
    subtitle: string;
    loading: string;
    loadingMore: string;
    noEvents: string;
    bookmark: string;
    like: string;
    viewDetails: string;
    newPlayer: string;
    upcomingMatch: string;
    newTournament: string;
    playerAchievement: string;
    clubEvent: string;
    distanceAway: string;
    timeAgo: string;
  };
}

export default function DiscoveryFeed({
  radius = 20,
  eventTypes,
  t,
}: DiscoveryFeedProps) {
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Load initial feed
  useEffect(() => {
    loadFeed(true);
  }, [radius, eventTypes]);

  // Load more when in view
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadFeed(false);
    }
  }, [inView, hasMore, isLoading]);

  const loadFeed = async (reset = false) => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        radius: radius.toString(),
        limit: '10',
        ...(eventTypes && { types: eventTypes.join(',') }),
        ...(cursor && !reset && { cursor }),
      });

      const response = await fetch(`/api/discover/feed?${params}`);
      if (response.ok) {
        const data = await response.json();

        setEvents((prev) => (reset ? data.events : [...prev, ...data.events]));
        setHasMore(data.has_more);
        setCursor(data.next_cursor);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = useCallback(async (eventId: string) => {
    try {
      const response = await fetch('/api/discover/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (response.ok) {
        setBookmarked((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(eventId)) {
            newSet.delete(eventId);
          } else {
            newSet.add(eventId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  }, []);

  const handleLike = useCallback(async (eventId: string) => {
    try {
      const response = await fetch('/api/discover/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (response.ok) {
        setLiked((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(eventId)) {
            newSet.delete(eventId);
          } else {
            newSet.add(eventId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  }, []);

  const getEventIcon = (type: DiscoveryEventType) => {
    switch (type) {
      case 'new_player':
        return <User className="w-5 h-5 text-blue-400" />;
      case 'upcoming_match':
        return <Calendar className="w-5 h-5 text-amber-400" />;
      case 'new_tournament':
        return <Trophy className="w-5 h-5 text-purple-400" />;
      case 'player_achievement':
        return <Star className="w-5 h-5 text-yellow-400" />;
      case 'club_event':
        return <Users className="w-5 h-5 text-green-400" />;
      default:
        return <MapPin className="w-5 h-5 text-slate-400" />;
    }
  };

  const getEventTypeLabel = (type: DiscoveryEventType): string => {
    const labels: Record<DiscoveryEventType, string> = {
      new_player: t.newPlayer,
      upcoming_match: t.upcomingMatch,
      new_tournament: t.newTournament,
      player_achievement: t.playerAchievement,
      club_event: t.clubEvent,
    };
    return labels[type] || type;
  };

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ${t.timeAgo}`;
    if (diffHours < 24) return `${diffHours}h ${t.timeAgo}`;
    return `${diffDays}d ${t.timeAgo}`;
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          <p className="text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{t.title}</h2>
        <p className="text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Feed */}
      {events.length === 0 ? (
        <div className="py-20 text-center">
          <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{t.noEvents}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 transition-all"
            >
              {/* Event Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <div className="p-2 bg-slate-900 rounded-lg">
                    {getEventIcon(event.event_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-indigo-400 uppercase">
                        {getEventTypeLabel(event.event_type)}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(event.created_at)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">
                      {event.metadata.title}
                    </h3>

                    <p className="text-slate-300 text-sm mb-3">
                      {event.metadata.description}
                    </p>

                    {/* Event Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {event.metadata.user_name && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <User className="w-4 h-4" />
                          <span>{event.metadata.user_name}</span>
                        </div>
                      )}

                      {event.metadata.location_name && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{event.metadata.location_name}</span>
                        </div>
                      )}

                      {event.metadata.distance_km !== undefined && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span>
                            {event.metadata.distance_km.toFixed(1)} km{' '}
                            {t.distanceAway}
                          </span>
                        </div>
                      )}

                      {event.metadata.datetime && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(event.metadata.datetime).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {event.metadata.level && (
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded capitalize">
                          {event.metadata.level}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleLike(event.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      liked.has(event.id)
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                    }`}
                    aria-label={t.like}
                  >
                    <Heart
                      className={`w-5 h-5 ${liked.has(event.id) ? 'fill-current' : ''}`}
                    />
                  </button>

                  <button
                    onClick={() => handleBookmark(event.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      bookmarked.has(event.id)
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                    }`}
                    aria-label={t.bookmark}
                  >
                    <Bookmark
                      className={`w-5 h-5 ${bookmarked.has(event.id) ? 'fill-current' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Image if available */}
              {event.metadata.image_url && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <img
                    src={event.metadata.image_url}
                    alt={event.metadata.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </article>
          ))}

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 text-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-400 text-sm">{t.loadingMore}</p>
            </div>
          )}

          {!hasMore && events.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-slate-500 text-sm">No more events to load</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
