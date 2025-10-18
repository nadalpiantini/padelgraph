/**
 * Tournament Card Component
 *
 * Displays tournament summary with key information and CTA button.
 * Used in tournament list and dashboard views.
 */

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Calendar, Users, MapPin, Trophy } from 'lucide-react';
import type { Tournament, TournamentType } from '@/types/database';

interface TournamentCardProps {
  tournament: Pick<
    Tournament,
    | 'id'
    | 'name'
    | 'type'
    | 'status'
    | 'starts_at'
    | 'max_participants'
    | 'location_lat'
    | 'location_lng'
  > & {
    participant_count?: number;
    user_status?: 'not_registered' | 'registered' | 'checked_in' | 'withdrawn';
  };
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const t = useTranslations('tournaments');
  const locale = useLocale();
  const startDate = new Date(tournament.starts_at);
  const now = new Date();
  const isUpcoming = startDate > now;
  const participantCount = tournament.participant_count || 0;

  // Get type label with translation
  const getTypeLabel = (type: TournamentType) => {
    return t(`format.${type}`);
  };

  // Get status label with translation
  const getStatusLabel = (status: string) => {
    return t(`status.${status}`);
  };

  // Determine CTA based on status
  const getCTA = () => {
    if (tournament.status === 'completed') {
      return { label: t('viewResults'), variant: 'secondary' as const };
    }
    if (tournament.status === 'in_progress') {
      return { label: t('viewBoard'), variant: 'primary' as const };
    }
    if (tournament.user_status === 'registered') {
      return { label: t('checkIn'), variant: 'primary' as const };
    }
    if (tournament.user_status === 'checked_in') {
      return { label: t('viewBoard'), variant: 'primary' as const };
    }
    if (participantCount >= tournament.max_participants) {
      return { label: t('full'), variant: 'disabled' as const };
    }
    return { label: t('join'), variant: 'primary' as const };
  };

  const cta = getCTA();

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {tournament.name}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusColors[tournament.status]
              }`}
            >
              {getStatusLabel(tournament.status)}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {getTypeLabel(tournament.type)}
            </span>
          </div>
        </div>
        <Trophy className="h-8 w-8 text-yellow-500" />
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          {isUpcoming ? t('starts') : t('started')}{' '}
          {startDate.toLocaleDateString(locale, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Users className="h-4 w-4 mr-2" />
          {participantCount} / {tournament.max_participants} {t('participants')}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          {tournament.location_lat.toFixed(4)}, {tournament.location_lng.toFixed(4)}
        </div>
      </div>

      {/* CTA Button */}
      <button
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          cta.variant === 'primary'
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : cta.variant === 'secondary'
            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        disabled={cta.variant === 'disabled'}
      >
        {cta.label}
      </button>
    </Link>
  );
}
