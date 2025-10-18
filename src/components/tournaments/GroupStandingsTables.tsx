'use client';

/**
 * Group Standings Tables Component
 *
 * Displays standings organized by groups for round-robin tournaments
 * with multiple groups. Shows top advancing players per group.
 */

import { useEffect, useState } from 'react';
import type {
  TournamentGroup,
  TournamentStandingWithProfile
} from '@/types/database';

interface GroupStandingsTablesProps {
  tournamentId: string;
  standings: TournamentStandingWithProfile[];
}

interface GroupWithStandings extends TournamentGroup {
  standings: TournamentStandingWithProfile[];
}

export default function GroupStandingsTables({
  tournamentId,
  standings
}: GroupStandingsTablesProps) {
  const [groups, setGroups] = useState<GroupWithStandings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        // Guard: Ensure standings is an array
        if (!Array.isArray(standings)) {
          console.warn('GroupStandingsTables: standings is not an array:', standings);
          setLoading(false);
          return;
        }

        // In a real implementation, this would be an API endpoint
        // For now, we'll simulate it by checking format_settings
        const res = await fetch(`/api/tournaments/${tournamentId}`);
        if (!res.ok) throw new Error('Failed to fetch tournament');

        const data = await res.json();
        const tournament = data.data?.tournament;

        // Check if tournament has groups
        const groupCount = tournament?.format_settings?.groups;

        if (!groupCount || groupCount <= 1) {
          // No groups, show message
          setLoading(false);
          return;
        }

        // Fetch groups from database
        // TODO: Create dedicated API endpoint /api/tournaments/[id]/groups
        // For now, organize standings by even distribution
        const groupsData: GroupWithStandings[] = [];
        const playersPerGroup = Math.ceil(standings.length / groupCount);

        for (let i = 0; i < groupCount; i++) {
          const groupStandings = standings.slice(
            i * playersPerGroup,
            (i + 1) * playersPerGroup
          );

          groupsData.push({
            id: `group-${i}`,
            tournament_id: tournamentId,
            group_name: String.fromCharCode(65 + i), // A, B, C, etc.
            group_number: i + 1,
            participant_ids: groupStandings.map(s => s.user_id),
            top_advance: tournament?.format_settings?.top_per_group || 2,
            created_at: new Date().toISOString(),
            standings: groupStandings
          });
        }

        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGroups();
  }, [tournamentId, standings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Clasificación
        </h2>
        <p className="text-gray-600 text-center py-8">
          Este torneo no utiliza grupos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Clasificación por Grupos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group) => (
          <GroupStandingsTable
            key={group.id}
            group={group}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Leyenda</h3>
        <div className="flex flex-wrap gap-4 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
            <span>Clasifican a playoffs ({groups[0]?.top_advance || 2} por grupo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
            <span>Eliminados</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Group Standings Table
 */
function GroupStandingsTable({ group }: { group: GroupWithStandings }) {
  // Sort standings by points, then by games difference
  const sortedStandings = [...group.standings].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    const diffA = a.games_won - a.games_lost;
    const diffB = b.games_won - b.games_lost;
    return diffB - diffA;
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Group Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-bold text-white">
          Grupo {group.group_name}
        </h3>
        <p className="text-blue-100 text-sm">
          Top {group.top_advance} clasifican
        </p>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jugador
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                PJ
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                G
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                P
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dif
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStandings.map((standing, index) => {
              const isAdvancing = index < group.top_advance;
              const gamesDiff = standing.games_won - standing.games_lost;

              return (
                <tr
                  key={standing.user_id}
                  className={isAdvancing ? 'bg-green-50' : ''}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`font-semibold ${isAdvancing ? 'text-green-700' : 'text-gray-900'}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-gray-600">
                          {standing.profile?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isAdvancing ? 'text-green-900' : 'text-gray-900'}`}>
                          {standing.profile?.name || 'Usuario'}
                        </div>
                        {isAdvancing && (
                          <div className="text-xs text-green-600">
                            ✓ Clasifica
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                    {standing.matches_played}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-600 font-medium">
                    {standing.matches_won}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-red-600 font-medium">
                    {standing.matches_lost}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-center font-medium ${
                    gamesDiff > 0 ? 'text-green-600' :
                    gamesDiff < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {gamesDiff > 0 ? '+' : ''}{gamesDiff}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${
                      isAdvancing
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {standing.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Group Stats Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{sortedStandings.length} jugadores</span>
          <span>
            Total partidos: {sortedStandings.reduce((sum, s) => sum + s.matches_played, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
