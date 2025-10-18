'use client';

import { MapPin, Calendar, User, Settings } from 'lucide-react';
import type { TravelPlan } from '@/lib/travel/types';

interface TravelPlanCardProps {
  plan: TravelPlan;
  onEdit?: (plan: TravelPlan) => void;
  onCancel?: (planId: string) => void;
}

export default function TravelPlanCard({ plan, onEdit, onCancel }: TravelPlanCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getDaysUntil = () => {
    const now = new Date();
    const start = new Date(plan.start_date);
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'In progress';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 transition-all duration-200 shadow-lg hover:shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <MapPin className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {plan.destination_city}
              </h3>
              {plan.destination_country && (
                <p className="text-sm text-slate-400">{plan.destination_country}</p>
              )}
            </div>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(plan.status)}`}
        >
          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
        </span>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2 mb-4 text-slate-300">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-sm">
          {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
        </span>
        {plan.status === 'active' && (
          <span className="ml-2 text-xs text-indigo-400 font-medium">
            {getDaysUntil()}
          </span>
        )}
      </div>

      {/* Preferences */}
      {plan.preferences && Object.keys(plan.preferences).length > 0 && (
        <div className="flex items-start gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {plan.preferences.level && (
                <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full capitalize">
                  Level: {plan.preferences.level}
                </span>
              )}
              {plan.preferences.format && (
                <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full capitalize">
                  Format: {plan.preferences.format}
                </span>
              )}
              {plan.preferences.looking_for && Array.isArray(plan.preferences.looking_for) && (
                <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full capitalize">
                  Looking for: {plan.preferences.looking_for.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {(onEdit || onCancel) && plan.status === 'active' && (
        <div className="flex gap-2 pt-4 border-t border-slate-700">
          {onEdit && (
            <button
              onClick={() => onEdit(plan)}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Edit Plan
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(plan.id)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
        <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
        {plan.updated_at && plan.updated_at !== plan.created_at && (
          <span>Updated {new Date(plan.updated_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
