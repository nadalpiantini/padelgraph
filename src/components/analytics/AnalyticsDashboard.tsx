'use client';

// Sprint 5: Analytics Dashboard Component (MVP)
// Displays player statistics with charts

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LeaderboardWidget from './LeaderboardWidget';

interface PlayerStats {
  total_matches: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  current_win_streak: number;
  best_win_streak: number;
  tournaments_won: number;
  elo_rating: number;
}

interface StatsEvolution {
  date: string;
  win_rate: number;
  elo_rating: number;
  matches_played: number;
}

export function AnalyticsDashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [evolution, setEvolution] = useState<StatsEvolution[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'all_time'>('all_time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch current stats
        const statsRes = await fetch(`/api/analytics/player/${userId}?period=${period}`);
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch evolution for charts
        const evolutionRes = await fetch(
          `/api/analytics/player/${userId}/evolution?period=week&limit=12`
        );
        const evolutionData = await evolutionRes.json();
        setEvolution(evolutionData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No statistics available yet. Play some matches!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'all_time'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === 'all_time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Matches"
          value={stats.total_matches}
          icon="🎾"
          color="blue"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.win_rate.toFixed(1)}%`}
          icon="🏆"
          color="green"
        />
        <StatCard
          title="Current Streak"
          value={stats.current_win_streak}
          subtitle={`Best: ${stats.best_win_streak}`}
          icon="🔥"
          color="orange"
        />
        <StatCard
          title="ELO Rating"
          value={stats.elo_rating}
          icon="⭐"
          color="purple"
        />
      </div>

      {/* Win/Loss Stats */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Match Results</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Wins</p>
            <p className="text-2xl font-bold text-green-600">{stats.matches_won}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Losses</p>
            <p className="text-2xl font-bold text-red-600">{stats.matches_lost}</p>
          </div>
        </div>
      </div>

      {/* ELO Evolution Chart */}
      {evolution.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">ELO Evolution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="elo_rating"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="ELO Rating"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Win Rate Evolution Chart */}
      {evolution.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Win Rate Evolution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="win_rate" fill="#10b981" name="Win Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tournament Stats */}
      {stats.tournaments_won > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tournament Achievements</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl">👑</div>
            <div>
              <p className="text-2xl font-bold">{stats.tournaments_won}</p>
              <p className="text-sm text-gray-500">Tournaments Won</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeaderboardWidget type="elo_rating" period={period} limit={10} />
        <LeaderboardWidget type="win_rate" period={period} limit={10} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
