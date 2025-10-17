'use client';

// Sprint 5: Leaderboard Table Component (MVP)
// Displays ranked players with infinite scroll

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rank: number;
  value: number;
  change?: number;
}

export function LeaderboardTable({
  type = 'global',
  metric = 'elo_rating',
}: {
  type?: string;
  metric?: string;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all_time'>('all_time');

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/leaderboards?type=${type}&metric=${metric}&period=${period}&limit=100`
        );
        const data = await res.json();
        setEntries(data.entries || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [type, metric, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const metricLabels: Record<string, string> = {
    elo_rating: 'ELO',
    win_rate: 'Win Rate',
    tournaments_won: 'Tournaments Won',
    win_streak: 'Win Streak',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard
          </h2>
          <p className="text-sm text-gray-500">
            {metricLabels[metric] || metric} Rankings
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'all_time'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-sm ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'all_time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {metricLabels[metric] || metric}
              </th>
              {period !== 'all_time' && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr
                key={entry.user_id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {entry.rank <= 3 && (
                      <span className="text-2xl mr-2">
                        {entry.rank === 1 && '🥇'}
                        {entry.rank === 2 && '🥈'}
                        {entry.rank === 3 && '🥉'}
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">
                      #{entry.rank}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {entry.avatar_url ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={entry.avatar_url}
                          alt={entry.username}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-semibold">
                            {entry.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {metric === 'win_rate'
                      ? `${entry.value.toFixed(1)}%`
                      : entry.value}
                  </span>
                </td>
                {period !== 'all_time' && entry.change !== undefined && (
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {entry.change > 0 && (
                      <span className="text-green-600 text-sm font-semibold">
                        ↑ {entry.change}
                      </span>
                    )}
                    {entry.change < 0 && (
                      <span className="text-red-600 text-sm font-semibold">
                        ↓ {Math.abs(entry.change)}
                      </span>
                    )}
                    {entry.change === 0 && (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No players in this leaderboard yet</p>
        </div>
      )}
    </div>
  );
}
