'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  User,
  MapPin,
  Calendar,
  Trophy,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Match suggestion filters
 */
export interface MatchFilters {
  skillLevel?: { min?: number; max?: number };
  location?: { city?: string; radius?: number };
  availability?: { from?: Date; to?: Date };
  preferredHand?: 'left' | 'right' | 'both';
  ageRange?: { min?: number; max?: number };
}

/**
 * User match data from recommendations API
 */
export interface UserMatch {
  id: string;
  recommended_id: string;
  recommended_type: 'players';
  score: number;
  metadata: {
    name: string;
    avatar_url?: string;
    skill_level?: number;
    location?: string;
    city?: string;
    compatible_factors?: string[];
    bio?: string;
    preferred_hand?: 'left' | 'right';
    age?: number;
  };
  created_at: string;
}

export interface MatchSuggestionsProps {
  maxResults?: number;
  filters?: MatchFilters;
  onInvite?: (userId: string) => void;
  t: {
    title: string;
    subtitle: string;
    loading: string;
    loadingMore: string;
    noMatches: string;
    matchScore: string;
    skillLevel: string;
    invite: string;
    invited: string;
    loadMore: string;
    compatible: string;
    skillLevels: {
      beginner: string;
      intermediate: string;
      advanced: string;
      expert: string;
    };
  };
}

/**
 * MatchSuggestions Component
 *
 * Displays personalized player recommendations in a grid layout
 * with match scores, skill levels, and compatibility indicators.
 */
export default function MatchSuggestions({
  maxResults = 20,
  filters,
  onInvite,
  t,
}: MatchSuggestionsProps) {
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Load matches on mount and when filters change
  useEffect(() => {
    loadMatches(true);
  }, [filters]);

  // Auto-load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !isLoading && matches.length < maxResults) {
      loadMatches(false);
    }
  }, [inView, hasMore, isLoading, matches.length, maxResults]);

  const loadMatches = async (reset = false) => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        type: 'players',
        limit: '10',
        include_shown: 'false',
      });

      const response = await fetch(`/api/recommendations?${params}`);

      if (response.ok) {
        const data = await response.json();
        const recommendations = data.recommendations || [];

        setMatches((prev) => (reset ? recommendations : [...prev, ...recommendations]));
        setHasMore(recommendations.length === 10 && matches.length + recommendations.length < maxResults);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = useCallback((recommendedId: string) => {
    setInvitedUsers((prev) => new Set(prev).add(recommendedId));
    onInvite?.(recommendedId);
  }, [onInvite]);

  const getSkillLevelColor = (level: number): string => {
    if (level <= 3) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (level <= 6) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (level <= 8) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  };

  const getSkillLevelLabel = (level: number): string => {
    if (level <= 3) return t.skillLevels.beginner;
    if (level <= 6) return t.skillLevels.intermediate;
    if (level <= 8) return t.skillLevels.advanced;
    return t.skillLevels.expert;
  };

  const getMatchScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (score >= 60) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    return 'bg-gradient-to-r from-slate-500 to-slate-600';
  };

  // Loading skeleton
  if (isLoading && matches.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          <p className="text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && matches.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          <p className="text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-20 text-center">
            <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">{t.noMatches}</p>
            <p className="text-slate-500 text-sm mt-2">
              Try adjusting your filters or check back later for new recommendations
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          {t.title}
        </h2>
        <p className="text-slate-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Match Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((match) => {
          const skillLevel = match.metadata.skill_level || 5;
          const matchScore = Math.round(match.score * 100);
          const isInvited = invitedUsers.has(match.recommended_id);

          return (
            <Card
              key={match.id}
              className="bg-slate-800 border-slate-700 hover:border-indigo-500/50 transition-all group"
            >
              <CardContent className="p-6">
                {/* User Info */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Avatar */}
                  <div className="relative">
                    {match.metadata.avatar_url ? (
                      <img
                        src={match.metadata.avatar_url}
                        alt={match.metadata.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 group-hover:border-indigo-500/50 transition-colors"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-slate-700 group-hover:border-indigo-500/50 transition-colors">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {/* Match Score Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1">
                      <div className={`w-6 h-6 rounded-full ${getMatchScoreColor(matchScore)} flex items-center justify-center text-xs font-bold text-white`}>
                        {matchScore}
                      </div>
                    </div>
                  </div>

                  {/* Name & Location */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {match.metadata.name}
                    </h3>
                    {match.metadata.location && (
                      <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{match.metadata.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Score Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{t.matchScore}</span>
                    <span className="font-semibold text-white">{matchScore}%</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getMatchScoreColor(matchScore)} transition-all duration-500`}
                      style={{ width: `${matchScore}%` }}
                    />
                  </div>
                </div>

                {/* Skill Level & Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">{t.skillLevel}:</span>
                    <Badge
                      variant="outline"
                      className={`${getSkillLevelColor(skillLevel)} border`}
                    >
                      {skillLevel}/10 • {getSkillLevelLabel(skillLevel)}
                    </Badge>
                  </div>

                  {/* Compatible Factors */}
                  {match.metadata.compatible_factors && match.metadata.compatible_factors.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm text-slate-400">{t.compatible}:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {match.metadata.compatible_factors.map((factor, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-indigo-500/10 text-indigo-400 text-xs"
                            >
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invite Button */}
                <Button
                  onClick={() => handleInvite(match.recommended_id)}
                  disabled={isInvited}
                  className="w-full"
                  variant={isInvited ? "secondary" : "default"}
                >
                  {isInvited ? (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      {t.invited}
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t.invite}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && matches.length < maxResults && (
        <div ref={loadMoreRef} className="mt-8 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">{t.loadingMore}</p>
            </div>
          ) : (
            <Button
              onClick={() => loadMatches(false)}
              variant="outline"
              className="border-slate-700 hover:border-indigo-500"
            >
              {t.loadMore}
            </Button>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasMore && matches.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            No more matches available. Check back later for new recommendations!
          </p>
        </div>
      )}
    </div>
  );
}
