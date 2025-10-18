'use client';

import { useEffect, useState } from 'react';
import { Plane, Plus, Filter } from 'lucide-react';
import TravelPlanCard from './TravelPlanCard';
import type { TravelPlan } from '@/lib/travel/types';

interface TravelPlansListProps {
  userId: string;
  onCreateNew?: () => void;
  onEditPlan?: (plan: TravelPlan) => void;
}

type FilterStatus = 'all' | 'active' | 'completed' | 'cancelled';

export default function TravelPlansList({
  userId,
  onCreateNew,
  onEditPlan,
}: TravelPlansListProps) {
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [filter]);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);

    try {
      const url =
        filter === 'all'
          ? '/api/travel-plans'
          : `/api/travel-plans?status=${filter}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load travel plans');
      }

      const data = await response.json();
      setPlans(data.travel_plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to cancel this travel plan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/travel-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel plan');
      }

      // Reload plans
      await loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel plan');
    }
  };

  const filteredPlans = plans;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Plane className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Travel Plans</h2>
            <p className="text-sm text-slate-400">
              {plans.length} {plans.length === 1 ? 'plan' : 'plans'} total
            </p>
          </div>
        </div>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Plan
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex gap-2">
          {(['all', 'active', 'completed', 'cancelled'] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <p className="font-medium">Error loading plans</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadPlans}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPlans.length === 0 && (
        <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-xl">
          <Plane className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-2">No travel plans found</p>
          <p className="text-slate-500 text-sm mb-4">
            {filter === 'all'
              ? 'Create your first travel plan to find padel matches abroad!'
              : `No ${filter} plans at the moment`}
          </p>
          {onCreateNew && filter === 'all' && (
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Your First Plan
            </button>
          )}
        </div>
      )}

      {/* Plans Grid */}
      {!loading && !error && filteredPlans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => (
            <TravelPlanCard
              key={plan.id}
              plan={plan}
              onEdit={onEditPlan}
              onCancel={handleCancelPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
