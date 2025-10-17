/**
 * Standings Table Component
 *
 * Displays tournament leaderboard with rankings and statistics.
 * Highlights current user and top performers.
 */

import { Trophy, Medal } from 'lucide-react';
import type { TournamentStandingWithProfile } from '@/types/database';

interface StandingsTableProps {
  standings: TournamentStandingWithProfile[];
  currentUserId?: string;
  compact?: boolean;
}

export function StandingsTable({
  standings,
  currentUserId,
  compact = false,
}: StandingsTableProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Clasificación
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                #
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Jugador
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Pts
              </th>
              {!compact && (
                <>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PJ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PG
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PE
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    PP
                  </th>
                </>
              )}
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                GF
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                GC
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Dif
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {standings.map((standing) => {
              const isCurrentUser = standing.user_id === currentUserId;
              return (
                <tr
                  key={standing.user_id}
                  className={`${
                    isCurrentUser
                      ? 'bg-indigo-50 font-semibold'
                      : (standing.rank ?? 0) <= 3
                      ? 'bg-yellow-50'
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {standing.rank && getRankIcon(standing.rank)}
                      <span className="text-sm font-medium text-gray-900">
                        {standing.rank ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {standing.profile.avatar_url ? (
                        <img
                          src={standing.profile.avatar_url}
                          alt={standing.profile.name || 'Usuario'}
                          className="h-8 w-8 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {standing.profile.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-gray-900">
                        {standing.profile.name || 'Usuario'}
                        {isCurrentUser && (
                          <span className="ml-2 text-indigo-600">(Tú)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-bold text-gray-900">
                      {standing.points}
                    </span>
                  </td>
                  {!compact && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {standing.matches_played}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">
                        {standing.matches_won}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {standing.matches_drawn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600">
                        {standing.matches_lost}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.games_won}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {standing.games_lost}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`text-sm font-medium ${
                        standing.games_diff > 0
                          ? 'text-green-600'
                          : standing.games_diff < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {standing.games_diff > 0 ? '+' : ''}
                      {standing.games_diff}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {standings.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          No hay clasificaciones disponibles aún
        </div>
      )}
    </div>
  );
}
