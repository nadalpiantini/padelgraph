/**
 * Tournament List Page
 *
 * Displays filterable list of tournaments with search and filter capabilities.
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { Trophy, Search, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import type { TournamentWithDetails } from '@/types/database';

async function getTournaments(filter?: string) {
  // TODO: Replace with actual API call
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tournaments?status=${filter || 'published'}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.data || [];
}

interface PageProps {
  searchParams: Promise<{ filter?: string; search?: string }>;
}

export default async function TournamentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tournaments = await getTournaments(params.filter);
  const t = await getTranslations('tournaments');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header with Branding */}
      <header className="border-b border-slate-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard" className="flex items-center gap-3">
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
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="h-8 w-8 text-indigo-500" />
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <Link
                href="/tournaments?filter=published"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !params.filter || params.filter === 'published'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {t('upcoming')}
              </Link>
              <Link
                href="/tournaments?filter=in_progress"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  params.filter === 'in_progress'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {t('inProgress')}
              </Link>
              <Link
                href="/tournaments?filter=completed"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  params.filter === 'completed'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {t('completed')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tournament Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-slate-800/30 rounded-lg shadow animate-pulse"
                />
              ))}
            </div>
          }
        >
          {tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament: TournamentWithDetails) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {t('noTournamentsAvailable')}
              </h3>
              <p className="text-slate-400">
                {params.filter === 'completed'
                  ? t('noCompletedTournaments')
                  : t('checkBackSoon')}
              </p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
