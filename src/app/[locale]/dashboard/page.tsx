import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// import { getTranslations } from 'next-intl/server'; // TODO: Add translations
import type { Metadata } from 'next';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  MapPin,
  Clock,
  Star
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard - PadelGraph',
  description: 'Your personal padel dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  // const t = await getTranslations('dashboard'); // TODO: Add translations

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Fetch user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch user statistics (we'll add real data later)
  const stats = {
    ranking: profile?.ranking_points || 0,
    matchesPlayed: 0,
    winRate: 0,
    upcomingMatches: 0,
  };

  // Fetch recent activity (placeholder for now)
  const recentActivity = [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <DashboardNavigation user={user} profile={profile} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.username || user.email?.split('@')[0]}
          </h1>
          <p className="text-slate-400">
            Your padel activity overview
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span className="text-sm text-slate-400">Ranking</span>
            </div>
            <div className="text-2xl font-bold">{stats.ranking} pts</div>
            <div className="text-sm text-green-400 mt-1">↑ 12% this month</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-blue-500" />
              <span className="text-sm text-slate-400">Matches</span>
            </div>
            <div className="text-2xl font-bold">{stats.matchesPlayed}</div>
            <div className="text-sm text-slate-400 mt-1">This month</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-sm text-slate-400">Win Rate</span>
            </div>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <div className="text-sm text-slate-400 mt-1">Last 10 matches</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-purple-500" />
              <span className="text-sm text-slate-400">Upcoming</span>
            </div>
            <div className="text-2xl font-bold">{stats.upcomingMatches}</div>
            <div className="text-sm text-slate-400 mt-1">Matches scheduled</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {/* Activity items will go here */}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
                <Link
                  href="/tournaments"
                  className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  Join a Tournament
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/tournaments"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>Browse Tournaments</span>
              </Link>

              <Link
                href="/rankings"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <Star className="w-5 h-5 text-blue-500" />
                <span>View Rankings</span>
              </Link>

              <Link
                href="/players"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <Users className="w-5 h-5 text-green-500" />
                <span>Find Players</span>
              </Link>

              <Link
                href="/courts"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <MapPin className="w-5 h-5 text-purple-500" />
                <span>Book Courts</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Matches
          </h2>
          <div className="text-center py-8 text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming matches</p>
            <Link
              href="/matches/create"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Schedule a Match
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}