import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import { Users, Search, MapPin, Trophy } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Players - PadelGraph',
  description: 'Find and connect with padel players',
};

interface Player {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  ranking_points: number;
}

async function getPlayers() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from('profiles')
    .select('id, username, name, bio, avatar_url, location, ranking_points')
    .order('ranking_points', { ascending: false })
    .limit(50);

  return players || [];
}

function getLevelBadge(points: number) {
  if (points >= 2000) return { label: 'Pro', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
  if (points >= 1000) return { label: 'Advanced', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  if (points >= 500) return { label: 'Intermediate', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
  return { label: 'Beginner', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
}

export default async function PlayersPage() {
  const supabase = await createClient();
  const t = await getTranslations('players');

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile for navigation
  let profile = null;
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = profileData;
  }

  const players: Player[] = await getPlayers();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {user && profile ? (
        <DashboardNavigation user={user} profile={profile} />
      ) : (
        <header className="border-b border-slate-800/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
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
            <Link
              href="/auth"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-all"
            >
              Join Network
            </Link>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">Connect with Players</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <select className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              <option>{t('allLevels')}</option>
              <option>Pro</option>
              <option>Advanced</option>
              <option>Intermediate</option>
              <option>Beginner</option>
            </select>
          </div>
        </div>

        {/* Players Grid */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-slate-800/30 rounded-2xl shadow animate-pulse"
                />
              ))}
            </div>
          }
        >
          {players.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => {
                const levelBadge = getLevelBadge(player.ranking_points);
                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.username}`}
                    className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="flex flex-col items-center text-center">
                      {/* Avatar */}
                      {player.avatar_url ? (
                        <Image
                          src={player.avatar_url}
                          alt={player.username}
                          width={100}
                          height={100}
                          className="rounded-full mb-4"
                        />
                      ) : (
                        <div className="w-[100px] h-[100px] bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                          <span className="text-4xl font-bold">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Name & Username */}
                      <h3 className="text-xl font-bold mb-1 group-hover:text-indigo-400 transition-colors">
                        {player.name || player.username}
                      </h3>
                      {player.name && (
                        <p className="text-sm text-slate-400 mb-3">@{player.username}</p>
                      )}

                      {/* Level Badge */}
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border mb-3 ${levelBadge.color}`}
                      >
                        {levelBadge.label}
                      </span>

                      {/* Bio */}
                      {player.bio && (
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                          {player.bio}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 text-sm">
                        {player.location && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-4 h-4" />
                            <span>{player.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Trophy className="w-4 h-4" />
                          <span>{player.ranking_points}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-medium text-slate-300 mb-2">
                {t('noPlayersFound')}
              </h3>
              <p className="text-slate-400">{t('tryAdjustingFilters')}</p>
            </div>
          )}
        </Suspense>

        {/* CTA */}
        {!user && (
          <div className="mt-12 text-center">
            <div className="inline-block bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-2xl p-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
              <h2 className="text-2xl font-bold mb-4">Join the Community</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Create your profile to connect with players and start competing
              </p>
              <Link
                href="/auth?mode=signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
              >
                Join Free Today
                <Users className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
