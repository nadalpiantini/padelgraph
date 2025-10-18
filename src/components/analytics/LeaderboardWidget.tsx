'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  value: number;
  username: string;
  avatar: string | null;
}

interface LeaderboardWidgetProps {
  type?: 'win_rate' | 'elo_rating' | 'total_matches';
  period?: 'week' | 'month' | 'all_time';
  limit?: number;
  showFilters?: boolean;
}

export default function LeaderboardWidget({
  type: initialType = 'elo_rating',
  period: initialPeriod = 'all_time',
  limit = 10,
  showFilters = true,
}: LeaderboardWidgetProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(initialType);
  const [period, setPeriod] = useState(initialPeriod);

  useEffect(() => {
    fetchLeaderboard();
  }, [type, period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/leaderboard?type=${type}&period=${period}&limit=${limit}`
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.rankings || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricLabel = () => {
    switch (type) {
      case 'win_rate':
        return 'Win Rate';
      case 'elo_rating':
        return 'ELO Rating';
      case 'total_matches':
        return 'Matches Played';
      default:
        return 'Score';
    }
  };

  const formatValue = (value: number) => {
    if (type === 'win_rate') return `${value.toFixed(1)}%`;
    return value.toString();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-slate-400 font-semibold">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Top Players</h3>
        </div>
        <span className="text-sm text-slate-400">{getMetricLabel()}</span>
      </div>

      {/* Leaderboard List */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No leaderboard data available yet
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div
              key={entry.user_id}
              className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  entry.username.charAt(0).toUpperCase()
                )}
              </div>

              {/* Username */}
              <div className="flex-1">
                <p className="text-white font-medium">{entry.username}</p>
              </div>

              {/* Value */}
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-400">
                  {formatValue(entry.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mt-6 pt-4 border-t border-slate-700 space-y-4">
          {/* Metric Type Selector */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Ranking By</label>
            <div className="flex gap-2">
              {([
                { value: 'elo_rating', label: 'ELO' },
                { value: 'win_rate', label: 'Win Rate' },
                { value: 'total_matches', label: 'Matches' },
              ] as const).map((metric) => (
                <button
                  key={metric.value}
                  onClick={() => setType(metric.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    type === metric.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Time Period</label>
            <div className="flex gap-2">
              {(['week', 'month', 'all_time'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    period === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {p === 'all_time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
