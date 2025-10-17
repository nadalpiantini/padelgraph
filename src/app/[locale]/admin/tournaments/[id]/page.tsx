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
  UserPlus,
  X,
  Edit,
  Save,
} from 'lucide-react';
import type {
  Tournament,
  TournamentParticipantWithProfile,
  TournamentRound,
  TournamentMatchWithDetails,
  TournamentStandingWithProfile,
} from '@/types/database';

interface AdminDashboardData {
  tournament: Tournament;
  participants: TournamentParticipantWithProfile[];
  all_rounds: TournamentRound[];
  all_matches: TournamentMatchWithDetails[];
  standings: TournamentStandingWithProfile[];
  issues: {
    missing_scores: TournamentMatchWithDetails[];
    overdue_matches: TournamentMatchWithDetails[];
    no_shows: TournamentParticipantWithProfile[];
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScore, setEditScore] = useState({ team1: 0, team2: 0 });

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

  const handleManualCheckIn = async (userId: string) => {
    setActionLoading(`checkin-${userId}`);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${userId}/check-in`,
        { method: 'POST' }
      );

      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error manual check-in:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveParticipant = async (userId: string, userName: string) => {
    if (
      !confirm(`¿Seguro que deseas eliminar a ${userName} del torneo?`)
    ) {
      return;
    }

    setActionLoading(`remove-${userId}`);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${userId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newParticipantEmail.trim()) {
      alert('Por favor ingresa un email');
      return;
    }

    setActionLoading('add-participant');
    try {
      // First, find user by email
      const userRes = await fetch(`/api/users/search?email=${encodeURIComponent(newParticipantEmail)}`);

      if (!userRes.ok) {
        alert('Usuario no encontrado');
        return;
      }

      const { data: user } = await userRes.json();

      // Add participant
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            status: 'registered',
          }),
        }
      );

      if (res.ok) {
        setShowAddModal(false);
        setNewParticipantEmail('');
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      alert('Error al agregar participante');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateScore = async (matchId: string, roundId: string) => {
    setActionLoading(`score-${matchId}`);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/matches/${matchId}/score`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team1_score: editScore.team1,
            team2_score: editScore.team2,
          }),
        }
      );

      if (res.ok) {
        setEditingMatch(null);
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating score:', error);
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gestión de Participantes
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <UserPlus className="h-5 w-5" />
              Agregar Participante
            </button>
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
                        {p.profile?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.profile?.name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {p.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status === 'registered' && (
                      <button
                        onClick={() => handleManualCheckIn(p.user_id)}
                        disabled={actionLoading === `checkin-${p.user_id}`}
                        className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        title="Manual check-in"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleRemoveParticipant(
                          p.user_id,
                          p.profile?.name || 'Usuario'
                        )
                      }
                      disabled={actionLoading === `remove-${p.user_id}`}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Eliminar participante"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Match Management */}
        {data.all_matches.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Gestión de Partidos
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {data.all_matches.slice(0, 10).map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Ronda{' '}
                        {data.all_rounds.find((r) => r.id === match.round_id)
                          ?.round_number || '?'}{' '}
                        - Cancha {match.court?.name || match.court_id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {match.team1_player1?.name || 'Jugador 1'} &{' '}
                        {match.team1_player2?.name || 'Jugador 2'} vs{' '}
                        {match.team2_player1?.name || 'Jugador 3'} &{' '}
                        {match.team2_player2?.name || 'Jugador 4'}
                      </p>
                    </div>

                    {editingMatch === match.id ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          value={editScore.team1}
                          onChange={(e) =>
                            setEditScore({
                              ...editScore,
                              team1: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          min="0"
                          value={editScore.team2}
                          onChange={(e) =>
                            setEditScore({
                              ...editScore,
                              team2: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() =>
                            handleUpdateScore(match.id, match.round_id)
                          }
                          disabled={actionLoading === `score-${match.id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          title="Guardar"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingMatch(null)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {match.team1_score ?? 0} - {match.team2_score ?? 0}
                        </span>
                        <button
                          onClick={() => {
                            setEditingMatch(match.id);
                            setEditScore({
                              team1: match.team1_score ?? 0,
                              team2: match.team2_score ?? 0,
                            });
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Editar marcador"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {data.all_matches.length > 10 && (
                <p className="text-sm text-gray-500 text-center mt-4">
                  Mostrando 10 de {data.all_matches.length} partidos
                </p>
              )}
            </div>
          </div>
        )}

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

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Agregar Participante
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewParticipantEmail('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddParticipant}>
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email del Usuario
                </label>
                <input
                  type="email"
                  id="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewParticipantEmail('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-participant'}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading === 'add-participant' ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
