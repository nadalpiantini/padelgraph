'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Settings, X, Plane } from 'lucide-react';
import type {
  TravelPlan,
  TravelSuggestion,
  CreateTravelPlanRequest,
  TravelLevel,
  TravelFormat,
} from '@/lib/travel/types';

interface TravelModePanelProps {
  userId: string;
  onClose?: () => void;
  t: {
    title: string;
    subtitle: string;
    destination: string;
    destinationPlaceholder: string;
    startDate: string;
    endDate: string;
    preferences: string;
    level: string;
    format: string;
    save: string;
    cancel: string;
    suggestions: string;
    noSuggestions: string;
    travelModeActive: string;
    errors: {
      destination: string;
      dates: string;
      invalidDates: string;
    };
  };
}

const levels: TravelLevel[] = ['beginner', 'intermediate', 'advanced', 'professional'];
const formats: TravelFormat[] = ['singles', 'doubles', 'any'];

export default function TravelModePanel({ userId, onClose, t }: TravelModePanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<TravelPlan | null>(null);
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);

  const [formData, setFormData] = useState<CreateTravelPlanRequest>({
    destination_city: '',
    destination_country: '',
    start_date: '',
    end_date: '',
    preferences: {
      level: 'intermediate',
      format: 'doubles',
    },
  });

  // Load active travel plan on mount
  useEffect(() => {
    loadActivePlan();
  }, [userId]);

  // Load suggestions when plan is active
  useEffect(() => {
    if (activePlan?.id) {
      loadSuggestions(activePlan.id);
    }
  }, [activePlan]);

  const loadActivePlan = async () => {
    try {
      const response = await fetch('/api/travel-plans?status=active');
      if (response.ok) {
        const plans = await response.json();
        if (plans.length > 0) {
          setActivePlan(plans[0]);
          setFormData({
            destination_city: plans[0].destination_city,
            destination_country: plans[0].destination_country || '',
            start_date: plans[0].start_date.split('T')[0],
            end_date: plans[0].end_date.split('T')[0],
            preferences: plans[0].preferences || {},
          });
        }
      }
    } catch (err) {
      console.error('Error loading travel plan:', err);
    }
  };

  const loadSuggestions = async (planId: string) => {
    try {
      const response = await fetch(`/api/travel-plans/${planId}/suggestions`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.destination_city.trim()) {
      setError(t.errors.destination);
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      setError(t.errors.dates);
      return false;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    if (end < start) {
      setError(t.errors.invalidDates);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const endpoint = activePlan ? `/api/travel-plans/${activePlan.id}` : '/api/travel-plans';
      const method = activePlan ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save travel plan');
      }

      const plan = await response.json();
      setActivePlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activePlan) {
      onClose?.();
      return;
    }

    try {
      await fetch(`/api/travel-plans/${activePlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setActivePlan(null);
      setSuggestions([]);
      setFormData({
        destination_city: '',
        destination_country: '',
        start_date: '',
        end_date: '',
        preferences: { level: 'intermediate', format: 'doubles' },
      });
    } catch (err) {
      console.error('Error cancelling plan:', err);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Plane className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t.title}</h2>
            <p className="text-sm text-slate-400">{t.subtitle}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Active Plan Badge */}
      {activePlan && (
        <div className="mx-6 mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-indigo-400">
            <Plane className="w-4 h-4" />
            <span className="font-medium">{t.travelModeActive}</span>
            <span className="text-white">
              {activePlan.destination_city}
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <MapPin className="w-4 h-4 inline-block mr-1" />
            {t.destination}
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.destination_city}
              onChange={(e) =>
                setFormData({ ...formData, destination_city: e.target.value })
              }
              placeholder={t.destinationPlaceholder}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
            <input
              type="text"
              value={formData.destination_country || ''}
              onChange={(e) =>
                setFormData({ ...formData, destination_country: e.target.value })
              }
              placeholder="Country (optional)"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline-block mr-1" />
              {t.startDate}
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline-block mr-1" />
              {t.endDate}
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
              min={formData.start_date || new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>
        </div>

        {/* Preferences */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Settings className="w-4 h-4 inline-block mr-1" />
            {t.preferences}
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t.level}</label>
              <select
                value={formData.preferences?.level || 'intermediate'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      level: e.target.value as TravelLevel,
                    },
                  })
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors capitalize"
              >
                {levels.map((level) => (
                  <option key={level} value={level} className="capitalize">
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t.format}</label>
              <select
                value={formData.preferences?.format || 'doubles'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      format: e.target.value as TravelFormat,
                    },
                  })
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors capitalize"
              >
                {formats.map((format) => (
                  <option key={format} value={format} className="capitalize">
                    {format}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'Saving...' : t.save}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {activePlan && suggestions.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t.suggestions}</h3>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-white">{suggestion.name}</h4>
                    {suggestion.address && (
                      <p className="text-sm text-slate-400 mt-1">{suggestion.address}</p>
                    )}
                    {suggestion.distance_km !== undefined && (
                      <p className="text-xs text-slate-500 mt-1">
                        {suggestion.distance_km.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-full capitalize">
                    {suggestion.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePlan && suggestions.length === 0 && (
        <div className="px-6 pb-6">
          <p className="text-slate-400 text-center py-8">{t.noSuggestions}</p>
        </div>
      )}
    </div>
  );
}
