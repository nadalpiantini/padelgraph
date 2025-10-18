'use client';

import { useState } from 'react';
import TravelPlansList from '@/components/travel/TravelPlansList';
import TravelModePanel from '@/components/travel/TravelModePanel';
import type { TravelPlan } from '@/lib/travel/types';

interface TravelDashboardClientProps {
  userId: string;
  profile: any;
  translations: any;
}

export default function TravelDashboardClient({
  userId,
  profile,
  translations,
}: TravelDashboardClientProps) {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TravelPlan | null>(null);

  const handleCreateNew = () => {
    setEditingPlan(null);
    setShowCreatePanel(true);
  };

  const handleEditPlan = (plan: TravelPlan) => {
    setEditingPlan(plan);
    setShowCreatePanel(true);
  };

  const handleClosePanel = () => {
    setShowCreatePanel(false);
    setEditingPlan(null);
    // Trigger refresh of plans list
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Travel Mode</h1>
          <p className="text-slate-400 text-lg">
            Plan your padel adventures and connect with players worldwide
          </p>
        </div>

        {/* Create/Edit Panel */}
        {showCreatePanel && (
          <div className="mb-8">
            <TravelModePanel
              userId={userId}
              onClose={handleClosePanel}
              t={translations}
            />
          </div>
        )}

        {/* Plans List */}
        <TravelPlansList
          userId={userId}
          onCreateNew={handleCreateNew}
          onEditPlan={handleEditPlan}
        />
      </div>
    </div>
  );
}
