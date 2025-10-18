'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Trophy,
  Building,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TravelPlan, TravelSuggestion } from '@/lib/travel/types';

interface TravelItineraryProps {
  plan: TravelPlan;
  suggestions?: TravelSuggestion[];
  onAddEvent?: (day: Date, event: DayEvent) => void;
  t: {
    itinerary: string;
    day: string;
    addEvent: string;
    noEvents: string;
    suggestions: string;
    morning: string;
    afternoon: string;
    evening: string;
    clubVisit: string;
    match: string;
    tournament: string;
    meetPlayer: string;
    distance: string;
  };
}

export interface DayEvent {
  id?: string;
  time: string;
  type: 'club_visit' | 'match' | 'tournament' | 'meet_player';
  title: string;
  location?: string;
  description?: string;
  suggestion_id?: string;
}

export default function TravelItinerary({ plan, suggestions = [], onAddEvent, t }: TravelItineraryProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<Record<string, DayEvent[]>>({});

  // Generate days array from travel plan
  const days = useMemo(() => {
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);
    const daysList: Date[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      daysList.push(new Date(d));
    }

    return daysList;
  }, [plan.start_date, plan.end_date]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const addEvent = (date: Date, event: DayEvent) => {
    const dateKey = formatDateKey(date);
    setEvents((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), event],
    }));
    onAddEvent?.(date, event);
  };

  const removeEvent = (date: Date, eventId: string) => {
    const dateKey = formatDateKey(date);
    setEvents((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey]?.filter((e) => e.id !== eventId) || [],
    }));
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDayNumber = (date: Date): number => {
    const start = new Date(plan.start_date);
    const diffTime = date.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const getEventIcon = (type: DayEvent['type']) => {
    switch (type) {
      case 'club_visit':
        return <Building className="w-4 h-4" />;
      case 'match':
        return <Calendar className="w-4 h-4" />;
      case 'tournament':
        return <Trophy className="w-4 h-4" />;
      case 'meet_player':
        return <User className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: DayEvent['type']) => {
    switch (type) {
      case 'club_visit':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'match':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'tournament':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'meet_player':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const getSuggestionsForDay = (date: Date): TravelSuggestion[] => {
    // In a real implementation, this would filter suggestions by relevance to the day
    return suggestions.slice(0, 3);
  };

  const getSuggestionIcon = (type: TravelSuggestion['type']) => {
    switch (type) {
      case 'club':
        return <Building className="w-4 h-4 text-green-400" />;
      case 'tournament':
        return <Trophy className="w-4 h-4 text-purple-400" />;
      case 'player':
        return <User className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Calendar className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t.itinerary}</h2>
          <p className="text-sm text-slate-400">
            {days.length} {days.length === 1 ? 'day' : 'days'} • {plan.destination_city}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {days.map((day, index) => {
          const dateKey = formatDateKey(day);
          const dayEvents = events[dateKey] || [];
          const isExpanded = expandedDays.has(dateKey);
          const daySuggestions = getSuggestionsForDay(day);

          return (
            <div
              key={dateKey}
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all"
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(dateKey)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-indigo-500/20 rounded-lg flex flex-col items-center justify-center border border-indigo-500/30">
                    <span className="text-2xl font-bold text-white">
                      {day.getDate()}
                    </span>
                    <span className="text-xs text-indigo-400 uppercase">
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">
                        {t.day} {getDayNumber(day)}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 text-sm">
                        {formatDate(day)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-slate-500">
                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                      </span>
                      {daySuggestions.length > 0 && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-sm text-indigo-400">
                            {daySuggestions.length} suggestion{daySuggestions.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Events */}
                  {dayEvents.length > 0 && (
                    <div className="space-y-2">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={event.id || idx}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${getEventColor(event.type)}`}
                        >
                          <div className="flex-shrink-0 p-2 bg-slate-900/50 rounded">
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3" />
                              <span className="text-sm font-medium">{event.time}</span>
                            </div>
                            <h4 className="font-medium text-white mb-1">{event.title}</h4>
                            {event.location && (
                              <p className="text-xs flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-sm text-slate-300 mt-1">{event.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => removeEvent(day, event.id || '')}
                            className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {dayEvents.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      {t.noEvents}
                    </div>
                  )}

                  {/* Suggestions */}
                  {daySuggestions.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                      <h4 className="text-sm font-medium text-slate-400 mb-3">
                        {t.suggestions}
                      </h4>
                      <div className="grid gap-2">
                        {daySuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-indigo-500/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {getSuggestionIcon(suggestion.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {suggestion.name}
                                </p>
                                {suggestion.address && (
                                  <p className="text-xs text-slate-500 truncate">
                                    {suggestion.address}
                                  </p>
                                )}
                                {suggestion.distance_km !== undefined && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {suggestion.distance_km.toFixed(1)} km {t.distance}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newEvent: DayEvent = {
                                  id: `${Date.now()}`,
                                  time: '10:00',
                                  type: suggestion.type === 'club' ? 'club_visit' : 'meet_player',
                                  title: suggestion.name,
                                  location: suggestion.address,
                                  suggestion_id: suggestion.id,
                                };
                                addEvent(day, newEvent);
                              }}
                              className="flex-shrink-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors ml-3"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Event Button */}
                  <button
                    onClick={() => {
                      const newEvent: DayEvent = {
                        id: `${Date.now()}`,
                        time: '10:00',
                        type: 'match',
                        title: 'New Event',
                        description: 'Click to edit details',
                      };
                      addEvent(day, newEvent);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t.addEvent}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
