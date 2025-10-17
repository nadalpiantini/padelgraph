/**
 * Admin Tournament Management Page
 *
 * Comprehensive admin dashboard for managing tournaments.
 * Includes participant management, round controls, and export options.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  ArrowLeft,
  Users,
  Play,
  CheckCircle,
  Download,
  AlertTriangle,
  Clock,
  UserX,
} from 'lucide-react';

interface AdminDashboardData {
  tournament: any;
  participants: any[];
  all_rounds: any[];
  all_matches: any[];
  standings: any[];
  issues: {
    missing_scores: any[];
    overdue_matches: any[];
    no_shows: any[];
  };
  stats: {
    total_participants: number;
    checked_in: number;
    total_rounds: number;
    completed_rounds: number;
    total_matches: number;
    completed_matches: number;
  };
}

export default function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const [tournamentId, setTournamentId] = useState<string>('');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setTournamentId(p.id));
  }, [params]);

  const fetchData = async () => {
    if (!tournamentId) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/admin`);
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      fetchData();
    }
  }, [tournamentId]);

  const handleStartTournament = async () => {
    setActionLoading('start');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court_strategy: 'balanced' }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error starting tournament:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteRound = async (roundId: string) => {
    setActionLoading(`complete-${roundId}`);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/complete`,
        { method: 'POST' }
      );

      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error completing round:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (format: 'pdf' | 'png') => {
    setActionLoading(`export-${format}`);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/export/rotation-board?format=${format}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rotation-board-${tournamentId}.${format}`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error al cargar datos
          </h1>
          <Link
            href="/admin/tournaments"
            className="text-indigo-600 hover:text-indigo-700"
          >
            Volver a torneos
          </Link>
        </div>
      </div>
    );
  }

  const currentRound = data.all_rounds.find((r) => r.status === 'in_progress');
  const canStart =
    data.tournament.status === 'published' && data.stats.checked_in >= 4;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/admin/tournaments"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a panel admin
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {data.tournament.name}
              </h1>
              <p className="text-sm text-gray-600">
                Panel de Administración - {data.tournament.type} Tournament
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {canStart && (
                <button
                  onClick={handleStartTournament}
                  disabled={actionLoading === 'start'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Play className="h-5 w-5" />
                  Iniciar Torneo
                </button>
              )}

              {currentRound && (
                <button
                  onClick={() => handleCompleteRound(currentRound.id)}
                  disabled={actionLoading === `complete-${currentRound.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5" />
                  Completar Ronda {currentRound.round_number}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-sm text-gray-600">Participantes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.total_participants}
                </p>
                <p className="text-xs text-gray-500">
                  {data.stats.checked_in} con check-in
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Rondas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.completed_rounds} / {data.stats.total_rounds}
                </p>
                <p className="text-xs text-gray-500">completadas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Partidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.stats.completed_matches} / {data.stats.total_matches}
                </p>
                <p className="text-xs text-gray-500">completados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Problemas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.issues.missing_scores.length +
                    data.issues.overdue_matches.length +
                    data.issues.no_shows.length}
                </p>
                <p className="text-xs text-gray-500">requieren atención</p>
              </div>
            </div>
          </div>
        </div>

        {/* Issues Section */}
        {(data.issues.missing_scores.length > 0 ||
          data.issues.overdue_matches.length > 0 ||
          data.issues.no_shows.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Problemas Detectados
            </h2>
            <div className="space-y-3">
              {data.issues.missing_scores.length > 0 && (
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-red-900">
                    {data.issues.missing_scores.length} partidos sin puntaje
                  </p>
                </div>
              )}
              {data.issues.overdue_matches.length > 0 && (
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-red-900">
                    {data.issues.overdue_matches.length} partidos vencidos
                  </p>
                </div>
              )}
              {data.issues.no_shows.length > 0 && (
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-red-900">
                    {data.issues.no_shows.length} jugadores ausentes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participants Management */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gestión de Participantes
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {data.participants.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {p.user_profile?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.user_profile?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {p.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'registered' && (
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Download className="h-6 w-6" />
              Opciones de Exportación
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={actionLoading === 'export-pdf'}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <Download className="h-8 w-8 text-indigo-600" />
                <span className="font-medium text-gray-900">
                  Exportar PDF
                </span>
                <span className="text-xs text-gray-500">
                  Rotation board en PDF
                </span>
              </button>

              <button
                onClick={() => handleExport('png')}
                disabled={actionLoading === 'export-png'}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <Download className="h-8 w-8 text-indigo-600" />
                <span className="font-medium text-gray-900">
                  Exportar PNG
                </span>
                <span className="text-xs text-gray-500">
                  Rotation board en imagen
                </span>
              </button>

              <button className="flex flex-col items-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
                <Download className="h-8 w-8 text-indigo-600" />
                <span className="font-medium text-gray-900">
                  Exportar CSV
                </span>
                <span className="text-xs text-gray-500">
                  Clasificación en CSV
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
