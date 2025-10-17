/**
 * Tournament List Page
 *
 * Displays filterable list of tournaments with search and filter capabilities.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { Trophy, Search } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Torneos</h1>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar torneos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Próximos
              </Link>
              <Link
                href="/tournaments?filter=in_progress"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  params.filter === 'in_progress'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                En Progreso
              </Link>
              <Link
                href="/tournaments?filter=completed"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  params.filter === 'completed'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Completados
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-white rounded-lg shadow animate-pulse"
                />
              ))}
            </div>
          }
        >
          {tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament: any) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay torneos disponibles
              </h3>
              <p className="text-gray-500">
                {params.filter === 'completed'
                  ? 'No se han completado torneos aún'
                  : 'Vuelve pronto para ver nuevos torneos'}
              </p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
