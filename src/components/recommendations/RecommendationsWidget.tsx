'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, User, Building, Trophy, X, MessageCircle, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import type {
  Recommendation,
  PlayerRecommendation,
  ClubRecommendation,
  TournamentRecommendation,
} from '@/lib/recommendations/types';

interface RecommendationsWidgetProps {
  userId: string;
  type?: 'player' | 'club' | 'tournament' | 'all';
  limit?: number;
  t: {
    title: string;
    subtitle: string;
    loading: string;
    noRecommendations: string;
    viewProfile: string;
    message: string;
    dismiss: string;
    helpful: string;
    notHelpful: string;
    recommendedBecause: string;
    similarLevel: string;
    nearbyLocation: string;
    sharedConnections: string;
    level: string;
    distance: string;
    courts: string;
    members: string;
    participants: string;
    startDate: string;
    format: string;
  };
}

export default function RecommendationsWidget({
  userId,
  type = 'all',
  limit = 10,
  t,
}: RecommendationsWidgetProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<Map<string, 'helpful' | 'not_helpful'>>(new Map());

  useEffect(() => {
    loadRecommendations();
  }, [userId, type]);

  const loadRecommendations = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        type: type,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/recommendations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? recommendations.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === recommendations.length - 1 ? 0 : prev + 1));
  };

  const handleDismiss = async (recId: string) => {
    try {
      await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recId,
          action: 'dismiss',
        }),
      });

      setRecommendations((prev) => prev.filter((r) => r.entity_id !== recId));
      if (currentIndex >= recommendations.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  };

  const handleFeedback = async (recId: string, isHelpful: boolean) => {
    try {
      await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recId,
          helpful: isHelpful,
        }),
      });

      setFeedback((prev) => {
        const newFeedback = new Map(prev);
        newFeedback.set(recId, isHelpful ? 'helpful' : 'not_helpful');
        return newFeedback;
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getRecommendationIcon = (rec: Recommendation) => {
    switch (rec.type) {
      case 'player':
        return <User className="w-6 h-6 text-blue-400" />;
      case 'club':
        return <Building className="w-6 h-6 text-green-400" />;
      case 'tournament':
        return <Trophy className="w-6 h-6 text-purple-400" />;
      default:
        return null;
    }
  };

  const renderRecommendationCard = (rec: Recommendation) => {
    if (rec.type === 'player') {
      const player = rec as PlayerRecommendation;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              {getRecommendationIcon(rec)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{player.player_name}</h3>
              <p className="text-sm text-slate-400 capitalize">{player.player_level}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {player.similarity_score !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.similarLevel}</span>
                <span className="text-white font-medium">
                  {(player.similarity_score * 100).toFixed(0)}% match
                </span>
              </div>
            )}
            {player.distance_km !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.distance}</span>
                <span className="text-white">{player.distance_km.toFixed(1)} km</span>
              </div>
            )}
            {player.shared_connections > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.sharedConnections}</span>
                <span className="text-white">{player.shared_connections}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (rec.type === 'club') {
      const club = rec as ClubRecommendation;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              {getRecommendationIcon(rec)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{club.club_name}</h3>
              <p className="text-sm text-slate-400">{club.club_city}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {club.distance_km !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.distance}</span>
                <span className="text-white">{club.distance_km.toFixed(1)} km</span>
              </div>
            )}
            {club.member_count !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.members}</span>
                <span className="text-white">{club.member_count}</span>
              </div>
            )}
            {club.avg_level && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.level}</span>
                <span className="text-white capitalize">{club.avg_level}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (rec.type === 'tournament') {
      const tournament = rec as TournamentRecommendation;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              {getRecommendationIcon(rec)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{tournament.tournament_name}</h3>
              <p className="text-sm text-slate-400 capitalize">{tournament.tournament_format}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {tournament.start_date && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.startDate}</span>
                <span className="text-white">
                  {new Date(tournament.start_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {tournament.distance_km !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.distance}</span>
                <span className="text-white">{tournament.distance_km.toFixed(1)} km</span>
              </div>
            )}
            {tournament.participants_count !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.participants}</span>
                <span className="text-white">{tournament.participants_count}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-800 border border-slate-700 rounded-xl p-8">
        <h2 className="text-xl font-bold text-white mb-2">{t.title}</h2>
        <p className="text-slate-400 mb-6">{t.subtitle}</p>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-slate-400">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-800 border border-slate-700 rounded-xl p-8">
        <h2 className="text-xl font-bold text-white mb-2">{t.title}</h2>
        <p className="text-slate-400 mb-6">{t.subtitle}</p>
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{t.noRecommendations}</p>
        </div>
      </div>
    );
  }

  const currentRec = recommendations[currentIndex];
  const currentFeedback = feedback.get(currentRec.entity_id);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{t.title}</h2>
        <p className="text-slate-400 text-sm">{t.subtitle}</p>
      </div>

      <div className="relative bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={() => handleDismiss(currentRec.entity_id)}
          className="absolute top-4 right-4 z-10 p-2 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
          aria-label={t.dismiss}
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>

        <div className="p-8 pt-12">
          {renderRecommendationCard(currentRec)}

          <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-indigo-400">{t.recommendedBecause}</span>
              <br />
              {currentRec.reason}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => window.location.href = `/${currentRec.type}/${currentRec.entity_id}`}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {t.viewProfile}
            </button>
            {currentRec.type === 'player' && (
              <button
                onClick={() => window.location.href = `/messages/${currentRec.entity_id}`}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {t.message}
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-3">Was this recommendation helpful?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback(currentRec.entity_id, true)}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  currentFeedback === 'helpful'
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${currentFeedback === 'helpful' ? 'fill-current' : ''}`} />
                <span className="text-sm">{t.helpful}</span>
              </button>
              <button
                onClick={() => handleFeedback(currentRec.entity_id, false)}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  currentFeedback === 'not_helpful'
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <ThumbsDown className={`w-4 h-4 ${currentFeedback === 'not_helpful' ? 'fill-current' : ''}`} />
                <span className="text-sm">{t.notHelpful}</span>
              </button>
            </div>
          </div>
        </div>

        {recommendations.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/90 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/90 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {recommendations.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {recommendations.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-indigo-500 w-6'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to recommendation ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {recommendations.length > 1 && (
        <div className="mt-3 text-center text-sm text-slate-500">
          {currentIndex + 1} / {recommendations.length}
        </div>
      )}
    </div>
  );
}