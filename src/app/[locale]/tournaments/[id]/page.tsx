/**
 * Tournament Detail Page
 *
 * Shows tournament information with tabs for Overview, Participants, Standings, and Board.
 * Includes action buttons based on tournament status and user participation.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  Clock,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { StandingsTable } from '@/components/tournaments/StandingsTable';
import { CheckInButton } from '@/components/tournaments/CheckInButton';

async function getTournamentDetails(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tournaments/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.data;
}

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { tab = 'overview' } = await searchParams;
  const tournament = await getTournamentDetails(id);

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Torneo no encontrado
          </h1>
          <Link
            href="/tournaments"
            className="text-indigo-600 hover:text-indigo-700"
          >
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(tournament.tournament.starts_at);
  const now = new Date();
  const isUpcoming = startDate > now;
  const timeUntilStart = isUpcoming ? startDate.getTime() - now.getTime() : 0;
  const daysUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
  const hoursUntilStart = Math.floor(
    (timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  const tabs = [
    { key: 'overview', label: 'Resumen' },
    { key: 'participants', label: 'Participantes' },
    { key: 'standings', label: 'Clasificación' },
    { key: 'board', label: 'Rotation Board' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/tournaments"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a torneos
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {tournament.tournament.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {startDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {tournament.participants.length} /{' '}
                  {tournament.tournament.max_participants}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {tournament.tournament.location_lat.toFixed(4)},{' '}
                  {tournament.tournament.location_lng.toFixed(4)}
                </div>
              </div>

              {/* Countdown */}
              {isUpcoming && daysUntilStart > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">
                    {daysUntilStart > 0 && `${daysUntilStart}d `}
                    {hoursUntilStart}h hasta el inicio
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {/* Check-In Button */}
              {tournament.tournament.status === 'published' && (
                <CheckInButton
                  tournamentId={tournament.tournament.id}
                  status={
                    tournament.participants.find(
                      (p: any) => p.user_id === 'current-user-id'
                    )?.status || 'not_registered'
                  }
                />
              )}

              {/* View Board Button */}
              {tournament.tournament.status === 'in_progress' && (
                <Link
                  href={`/tournaments/${id}/board`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                  Ver Board en Vivo
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8" aria-label="Tabs">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/tournaments/${id}?tab=${t.key}`}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  tab === t.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div>Cargando...</div>}>
          {tab === 'overview' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Información del Torneo
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {tournament.tournament.type}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {tournament.tournament.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Duración del partido
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tournament.tournament.match_duration_minutes} minutos
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Radio de geofence
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tournament.tournament.geofence_radius_meters} metros
                  </dd>
                </div>
              </dl>

              {tournament.tournament.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Descripción
                  </h3>
                  <p className="text-sm text-gray-900">
                    {tournament.tournament.description}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Partidos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournament.stats.total_matches}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Completados</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournament.stats.completed_matches}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Progreso</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournament.stats.progress_percentage}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'participants' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Participantes ({tournament.participants.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournament.participants.map((p: any) => (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {p.user_profile?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {p.user_profile?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {p.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'standings' && (
            <StandingsTable standings={tournament.standings} />
          )}

          {tab === 'board' && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-center text-gray-500">
                El rotation board está disponible en una página dedicada.
              </p>
              <div className="flex justify-center mt-4">
                <Link
                  href={`/tournaments/${id}/board`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <ExternalLink className="h-5 w-5" />
                  Ir al Board
                </Link>
              </div>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
