import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import {
  User,
  Trophy,
  Calendar,
  MapPin,
  Award,
  TrendingUp,
  Activity,
  Mail,
  Edit,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Profile - PadelGraph',
  description: 'Your profile and statistics',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const t = await getTranslations('profile');

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

  // Fetch user statistics
  const stats = {
    ranking: profile?.ranking_points || 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <DashboardNavigation user={user} profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            {/* Avatar Section */}
            <div className="relative">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username || 'User'}
                  width={150}
                  height={150}
                  className="rounded-2xl"
                />
              ) : (
                <div className="w-[150px] h-[150px] bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <span className="text-6xl font-bold">
                    {(profile?.username || user.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <Link
                href="/settings"
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                <Edit className="w-5 h-5" />
              </Link>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {profile?.username || user.email?.split('@')[0] || 'User'}
                  </h1>
                  {profile?.bio && (
                    <p className="text-slate-300 text-lg mb-4">{profile.bio}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.ranking}</div>
                  <div className="text-sm text-slate-400">{t('rankingPoints')}</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.matchesPlayed}</div>
                  <div className="text-sm text-slate-400">{t('matches')}</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.winRate}%</div>
                  <div className="text-sm text-slate-400">{t('winRate')}</div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{stats.currentStreak}</div>
                  <div className="text-sm text-slate-400">{t('streak')}</div>
                </div>
              </div>

              {/* Contact & Location Info */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                {profile?.location && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t('memberSince', {
                      date: new Date(user.created_at || '').toLocaleDateString(),
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Activity className="w-6 h-6 text-indigo-500" />
            {t('recentActivity')}
          </h2>
          <div className="text-center py-12 text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p>{t('noActivityYet')}</p>
            <p className="text-sm mt-2">{t('startPlayingToSeeActivity')}</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-500" />
            {t('achievements')}
          </h2>
          <div className="text-center py-12 text-slate-400">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p>{t('noAchievementsYet')}</p>
            <p className="text-sm mt-2">{t('earnAchievementsByPlaying')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
