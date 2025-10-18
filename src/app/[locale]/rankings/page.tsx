import { Trophy, Medal, Award, TrendingUp, ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Player Rankings | PadelGraph',
  description: 'Real-time padel player rankings and leaderboards',
};

interface Player {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  elo_rating: number;
  rank_points: number;
  matches_played: number;
  wins: number;
  losses: number;
}

async function getRankings() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/rankings?limit=50`,
      {
        cache: 'no-store', // Real-time rankings
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.players || [];
  } catch (error) {
    console.error('Failed to fetch rankings:', error);
    return [];
  }
}

function getRankIcon(index: number) {
  if (index === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
  if (index === 1) return <Medal className="w-6 h-6 text-slate-300" />;
  if (index === 2) return <Award className="w-6 h-6 text-orange-400" />;
  return null;
}

function getLevelColor(level: string) {
  const colors = {
    pro: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    advanced: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    intermediate: 'text-green-400 bg-green-500/10 border-green-500/20',
    beginner: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };
  return colors[level as keyof typeof colors] || colors.beginner;
}

export default async function RankingsPage() {
  const players: Player[] = await getRankings();
  const t = await getTranslations('rankings');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/branding/padelgraph_logo_01.png"
                alt="PadelGraph Logo"
                width={100}
                height={100}
                className="rounded-xl"
                priority
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
              <Link
                href="/auth"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-all"
              >
                {t('cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">{t('liveBadge')}</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Rankings Table */}
        {players.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">{t('noRankings')}</p>
          </div>
        ) : (
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">
                      {t('rank')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">
                      {t('player')}
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">
                      {t('level')}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-300">
                      {t('points')}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-300">
                      {t('rating')}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-300">
                      {t('matches')}
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-slate-300">
                      {t('winRate')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {players.map((player, index) => {
                    const winRate =
                      player.matches_played > 0
                        ? ((player.wins / player.matches_played) * 100).toFixed(
                            0
                          )
                        : 0;
                    return (
                      <tr
                        key={player.user_id}
                        className="hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getRankIcon(index)}
                            <span
                              className={`font-bold ${index < 3 ? 'text-lg' : 'text-slate-400'}`}
                            >
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {player.avatar_url ? (
                              <Image
                                src={player.avatar_url}
                                alt={player.username}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium">
                                {player.username?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">
                                {player.full_name || player.username}
                              </div>
                              {player.full_name && (
                                <div className="text-sm text-slate-400">
                                  @{player.username || 'unknown'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${getLevelColor(player.skill_level)}`}
                          >
                            {t(`levels.${player.skill_level}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold">
                          {player.rank_points?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300">
                          {player.elo_rating}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300">
                          {player.matches_played}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`font-medium ${
                              Number(winRate) >= 60
                                ? 'text-green-400'
                                : Number(winRate) >= 40
                                  ? 'text-yellow-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {winRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-2xl p-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
            <h2 className="text-2xl font-bold mb-4">{t('cta.heading')}</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {t('cta.text')}
            </p>
            <Link
              href="/auth?mode=signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
            >
              {t('cta.button')}
              <Trophy className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
