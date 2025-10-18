import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import SocialFeed from '@/components/social/SocialFeed';
import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  MapPin,
  Star
} from 'lucide-react';
import { Link } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Dashboard - PadelGraph',
  description: 'Your personal padel dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations('dashboard');

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

  // Prepare user data for SocialFeed
  const currentUser = {
    id: user.id,
    name: profile?.name || null,
    username: profile?.username || user.email?.split('@')[0] || 'user',
    avatar_url: profile?.avatar_url || null,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <DashboardNavigation user={user} profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t('welcome', { username: profile?.username || user.email?.split('@')[0] || 'User' })}
          </h1>
          <p className="text-slate-400">
            {t('overview')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span className="text-sm text-slate-400">{t('ranking')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.ranking} pts</div>
            <div className="text-sm text-green-400 mt-1">{t('changeThisMonth', { percent: 12 })}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-blue-500" />
              <span className="text-sm text-slate-400">{t('matches')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.matchesPlayed}</div>
            <div className="text-sm text-slate-400 mt-1">{t('thisMonth')}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-sm text-slate-400">{t('winRate')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <div className="text-sm text-slate-400 mt-1">{t('lastMatches', { count: 10 })}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-purple-500" />
              <span className="text-sm text-slate-400">{t('upcoming')}</span>
            </div>
            <div className="text-2xl font-bold">{stats.upcomingMatches}</div>
            <div className="text-sm text-slate-400 mt-1">{t('matchesScheduled')}</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Social Feed - Main Column */}
          <div className="lg:col-span-3">
            <SocialFeed currentUser={currentUser} showCreatePost={true} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">{t('quickActions')}</h2>
              <div className="space-y-3">
                <Link
                  href="/tournaments"
                  className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span>{t('browseTournaments')}</span>
                </Link>

                <Link
                  href="/rankings"
                  className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Star className="w-5 h-5 text-blue-500" />
                  <span>{t('viewRankings')}</span>
                </Link>

                <Link
                  href="/players"
                  className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Users className="w-5 h-5 text-green-500" />
                  <span>{t('findPlayers')}</span>
                </Link>

                <Link
                  href="/courts"
                  className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <MapPin className="w-5 h-5 text-purple-500" />
                  <span>{t('bookCourts')}</span>
                </Link>
              </div>
            </div>

            {/* Upcoming Matches */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('upcomingMatches')}
              </h2>
              <div className="text-center py-6 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-4">{t('noUpcomingMatches')}</p>
                <Link
                  href="/matches/create"
                  className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors text-sm"
                >
                  {t('scheduleMatch')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}