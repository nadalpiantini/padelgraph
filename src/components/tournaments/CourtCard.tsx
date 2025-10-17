/**
 * Court Card Component
 *
 * Displays a single court with match details for rotation board.
 * Shows teams, scores, and match status.
 */

import { User } from 'lucide-react';

interface Player {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

interface CourtCardProps {
  court: {
    id: string;
    name: string;
  };
  match?: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'forfeited';
    team1_score?: number;
    team2_score?: number;
    team1_player1: Player;
    team1_player2: Player;
    team2_player1: Player;
    team2_player2: Player;
  };
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
  in_progress: {
    label: 'En Progreso',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  completed: {
    label: 'Completado',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  forfeited: {
    label: 'Forfeit',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
};

function PlayerAvatar({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2">
      {player.avatar_url ? (
        <img
          src={player.avatar_url}
          alt={player.full_name}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="h-5 w-5 text-gray-500" />
        </div>
      )}
      <span className="text-sm font-medium text-gray-900">{player.full_name}</span>
    </div>
  );
}

export function CourtCard({ court, match }: CourtCardProps) {
  if (!match) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{court.name}</h3>
        <p className="text-center text-gray-500 py-8">Sin partido asignado</p>
      </div>
    );
  }

  const status = statusConfig[match.status];

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      {/* Court Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}
        >
          {status.label}
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-4">
        {/* Team 1 */}
        <div
          className={`rounded-lg p-4 ${
            match.status === 'completed' &&
            match.team1_score !== undefined &&
            match.team2_score !== undefined &&
            match.team1_score > match.team2_score
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">EQUIPO 1</span>
            {match.team1_score !== undefined && (
              <span className="text-2xl font-bold text-gray-900">
                {match.team1_score}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <PlayerAvatar player={match.team1_player1} />
            <PlayerAvatar player={match.team1_player2} />
          </div>
        </div>

        {/* VS Divider */}
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold">
            VS
          </span>
        </div>

        {/* Team 2 */}
        <div
          className={`rounded-lg p-4 ${
            match.status === 'completed' &&
            match.team1_score !== undefined &&
            match.team2_score !== undefined &&
            match.team2_score > match.team1_score
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">EQUIPO 2</span>
            {match.team2_score !== undefined && (
              <span className="text-2xl font-bold text-gray-900">
                {match.team2_score}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <PlayerAvatar player={match.team2_player1} />
            <PlayerAvatar player={match.team2_player2} />
          </div>
        </div>
      </div>
    </div>
  );
}
