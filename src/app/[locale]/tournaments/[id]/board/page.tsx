/**
 * Rotation Board Page
 *
 * Real-time display of current round with all courts and matches.
 * Auto-refreshes every 30 seconds for live updates.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  ArrowLeft,
  RefreshCw,
  Clock,
  PlayCircle,
  CheckCircle,
} from 'lucide-react';
import { CourtCard } from '@/components/tournaments/CourtCard';
import { StandingsTable } from '@/components/tournaments/StandingsTable';
import type {
  TournamentRound,
  TournamentStandingWithProfile,
  Tournament,
} from '@/types/database';

interface RotationBoardData {
  round: TournamentRound;
  matches: Array<{
    id: string;
    court_id: string;
    court_name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'forfeited';
    team1_score?: number;
    team2_score?: number;
    team1_player1: {
      user_id: string;
      full_name: string;
      avatar_url?: string;
    };
    team1_player2: {
      user_id: string;
      full_name: string;
      avatar_url?: string;
    };
    team2_player1: {
      user_id: string;
      full_name: string;
      avatar_url?: string;
    };
    team2_player2: {
      user_id: string;
      full_name: string;
      avatar_url?: string;
    };
  }>;
  tournament: Pick<Tournament, 'id' | 'name' | 'type'>;
  standings: TournamentStandingWithProfile[];
}

export default function RotationBoardPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [tournamentId, setTournamentId] = useState<string>('');
  const [data, setData] = useState<RotationBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    params.then((p) => setTournamentId(p.id));
  }, [params]);

  const fetchData = async () => {
    if (!tournamentId) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/current`);
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching rotation board:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando rotation board...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No hay ronda activa
          </h1>
          <p className="text-gray-600 mb-4">
            El torneo aún no ha comenzado o ya finalizó
          </p>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="text-indigo-600 hover:text-indigo-700"
          >
            Volver al torneo
          </Link>
        </div>
      </div>
    );
  }

  const roundStatusConfig = {
    pending: {
      icon: Clock,
      label: 'Pendiente',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    in_progress: {
      icon: PlayCircle,
      label: 'En Progreso',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    completed: {
      icon: CheckCircle,
      label: 'Completada',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  };

  const roundStatus = roundStatusConfig[data.round.status];
  const StatusIcon = roundStatus.icon;

  // Group matches by court
  const courtMatches = data.matches.reduce((acc, match) => {
    if (!acc[match.court_id]) {
      acc[match.court_id] = {
        court: { id: match.court_id, name: match.court_name },
        match,
      };
    }
    return acc;
  }, {} as Record<string, { court: { id: string; name: string }; match: RotationBoardData['matches'][0] }>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al torneo
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {data.tournament.name}
              </h1>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${roundStatus.bgColor}`}>
                  <StatusIcon className={`h-5 w-5 ${roundStatus.color}`} />
                  <span className={`font-medium ${roundStatus.color}`}>
                    Ronda {data.round.round_number} - {roundStatus.label}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>

              {/* Manual refresh */}
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Court Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.values(courtMatches).map(({ court, match }) => (
            <CourtCard key={court.id} court={court} match={match} />
          ))}
        </div>

        {/* Standings Preview */}
        {data.standings && data.standings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Clasificación Actual
            </h2>
            <StandingsTable standings={data.standings.slice(0, 10)} compact />
          </div>
        )}
      </div>
    </div>
  );
}
