'use client';

import { useState, useEffect } from 'react';
import TravelPlansList from '@/components/travel/TravelPlansList';
import TravelModePanel from '@/components/travel/TravelModePanel';
import TravelItinerary from '@/components/travel/TravelItinerary';
import type { TravelPlan, TravelSuggestion } from '@/lib/travel/types';

interface TravelDashboardClientProps {
  userId: string;
  profile: any;
  translations: any;
}

export default function TravelDashboardClient({
  userId,
  translations,
}: TravelDashboardClientProps) {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null);
  const [suggestions, setSuggestions] = useState<TravelSuggestion[]>([]);

  // Load suggestions when a plan is selected
  useEffect(() => {
    if (selectedPlan?.id) {
      loadSuggestions(selectedPlan.id);
    }
  }, [selectedPlan]);

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

  const handleCreateNew = () => {
    setSelectedPlan(null);
    setShowCreatePanel(true);
  };

  const handleEditPlan = (plan: TravelPlan) => {
    setSelectedPlan(plan);
    setShowCreatePanel(true);
  };

  const handleViewItinerary = (plan: TravelPlan) => {
    setSelectedPlan(plan);
    setShowCreatePanel(false);
  };

  const handleClosePanel = () => {
    setShowCreatePanel(false);
    setSelectedPlan(null);
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

        {/* Itinerary View */}
        {selectedPlan && !showCreatePanel && (
          <div className="mb-8">
            <TravelItinerary
              plan={selectedPlan}
              suggestions={suggestions}
              t={{
                itinerary: 'Itinerary',
                day: 'Day',
                addEvent: 'Add Event',
                noEvents: 'No events planned for this day',
                suggestions: 'Suggestions',
                morning: 'Morning',
                afternoon: 'Afternoon',
                evening: 'Evening',
                clubVisit: 'Club Visit',
                match: 'Match',
                tournament: 'Tournament',
                meetPlayer: 'Meet Player',
                distance: 'away',
              }}
            />
          </div>
        )}

        {/* Plans List */}
        <TravelPlansList
          userId={userId}
          onCreateNew={handleCreateNew}
          onEditPlan={handleEditPlan}
          onViewItinerary={handleViewItinerary}
        />
      </div>
    </div>
  );
}
