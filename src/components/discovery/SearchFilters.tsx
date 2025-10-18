'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filter, MapPin, Trophy, Calendar, Target, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

/**
 * Discovery filter types
 */
export interface DiscoveryFilters {
  skillLevel?: { min?: number; max?: number };
  location?: { city?: string; radius?: number };
  availability?: { from?: Date; to?: Date };
  preferredHand?: 'left' | 'right' | 'both';
  ageRange?: { min?: number; max?: number };
}

export interface SearchFiltersProps {
  onFilterChange: (filters: DiscoveryFilters) => void;
  initialFilters?: DiscoveryFilters;
  t: {
    title: string;
    subtitle: string;
    skillLevel: string;
    skillMin: string;
    skillMax: string;
    location: string;
    city: string;
    cityPlaceholder: string;
    radius: string;
    radiusKm: string;
    availability: string;
    dateFrom: string;
    dateTo: string;
    preferredHand: string;
    left: string;
    right: string;
    both: string;
    ageRange: string;
    ageMin: string;
    ageMax: string;
    applyFilters: string;
    resetFilters: string;
    activeFilters: string;
    collapse: string;
    expand: string;
  };
}

// Common Spanish cities for padel
const COMMON_CITIES = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Málaga',
  'Bilbao',
  'Alicante',
  'Zaragoza',
  'Murcia',
  'Granada',
];

/**
 * SearchFilters Component
 *
 * Provides comprehensive filtering controls for discovery features
 * including skill level, location, availability, and player preferences.
 */
export default function SearchFilters({
  onFilterChange,
  initialFilters,
  t,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filters, setFilters] = useState<DiscoveryFilters>(initialFilters || {});
  const [hasChanges, setHasChanges] = useState(false);

  // Debounced filter change
  useEffect(() => {
    if (hasChanges) {
      const timer = setTimeout(() => {
        onFilterChange(filters);
        setHasChanges(false);
      }, 300);

      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [filters, hasChanges, onFilterChange]);

  const updateFilter = useCallback((key: keyof DiscoveryFilters, value: any) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (value === undefined || (typeof value === 'object' && Object.values(value).every(v => v === undefined))) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    });
    setHasChanges(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setHasChanges(true);
  }, []);

  const getActiveFilterCount = useCallback((): number => {
    let count = 0;
    if (filters.skillLevel) count++;
    if (filters.location?.city) count++;
    if (filters.availability) count++;
    if (filters.preferredHand && filters.preferredHand !== 'both') count++;
    if (filters.ageRange) count++;
    return count;
  }, [filters]);

  const activeCount = getActiveFilterCount();

  return (
    <Card className="bg-slate-800 border-slate-700 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-400" />
            {t.title}
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 ml-2">
                {activeCount} {t.activeFilters}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white"
          >
            {isExpanded ? t.collapse : t.expand}
          </Button>
        </div>
        {!isExpanded && <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Skill Level */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-slate-400" />
              <Label className="text-sm font-medium text-white">{t.skillLevel}</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.skillMin}</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={filters.skillLevel?.min || ''}
                  onChange={(e) => {
                    const min = parseInt(e.target.value) || undefined;
                    updateFilter('skillLevel', {
                      min,
                      max: filters.skillLevel?.max,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.skillMax}</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={filters.skillLevel?.max || ''}
                  onChange={(e) => {
                    const max = parseInt(e.target.value) || undefined;
                    updateFilter('skillLevel', {
                      min: filters.skillLevel?.min,
                      max,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="10"
                />
              </div>
            </div>
            {/* Visual Range Indicator */}
            {filters.skillLevel && (filters.skillLevel.min || filters.skillLevel.max) && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Target className="w-3.5 h-3.5" />
                <span>
                  {t.skillLevel}: {filters.skillLevel.min || 1} - {filters.skillLevel.max || 10}
                </span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <Label className="text-sm font-medium text-white">{t.location}</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.city}</Label>
                <select
                  value={filters.location?.city || ''}
                  onChange={(e) => {
                    updateFilter('location', {
                      city: e.target.value || undefined,
                      radius: filters.location?.radius || 20,
                    });
                  }}
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t.cityPlaceholder}</option>
                  {COMMON_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">
                  {t.radius} ({filters.location?.radius || 20} {t.radiusKm})
                </Label>
                <Input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={filters.location?.radius || 20}
                  onChange={(e) => {
                    updateFilter('location', {
                      city: filters.location?.city,
                      radius: parseInt(e.target.value),
                    });
                  }}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Label className="text-sm font-medium text-white">{t.availability}</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.dateFrom}</Label>
                <Input
                  type="date"
                  value={
                    filters.availability?.from
                      ? filters.availability.from.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const from = e.target.value ? new Date(e.target.value) : undefined;
                    updateFilter('availability', {
                      from,
                      to: filters.availability?.to,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.dateTo}</Label>
                <Input
                  type="date"
                  value={
                    filters.availability?.to
                      ? filters.availability.to.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const to = e.target.value ? new Date(e.target.value) : undefined;
                    updateFilter('availability', {
                      from: filters.availability?.from,
                      to,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Preferred Hand */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">{t.preferredHand}</Label>
            <div className="flex gap-2">
              {(['left', 'right', 'both'] as const).map((hand) => (
                <Button
                  key={hand}
                  variant={filters.preferredHand === hand ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilter('preferredHand', hand)}
                  className={
                    filters.preferredHand === hand
                      ? 'bg-indigo-500 hover:bg-indigo-600'
                      : 'border-slate-700 hover:border-indigo-500'
                  }
                >
                  {t[hand]}
                </Button>
              ))}
            </div>
          </div>

          {/* Age Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">{t.ageRange}</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.ageMin}</Label>
                <Input
                  type="number"
                  min="18"
                  max="80"
                  value={filters.ageRange?.min || ''}
                  onChange={(e) => {
                    const min = parseInt(e.target.value) || undefined;
                    updateFilter('ageRange', {
                      min,
                      max: filters.ageRange?.max,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="18"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400 mb-1.5 block">{t.ageMax}</Label>
                <Input
                  type="number"
                  min="18"
                  max="80"
                  value={filters.ageRange?.max || ''}
                  onChange={(e) => {
                    const max = parseInt(e.target.value) || undefined;
                    updateFilter('ageRange', {
                      min: filters.ageRange?.min,
                      max,
                    });
                  }}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="80"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button
              onClick={resetFilters}
              variant="outline"
              className="flex-1 border-slate-700 hover:border-red-500 hover:text-red-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.resetFilters}
            </Button>
            <Button
              onClick={() => {
                onFilterChange(filters);
                setHasChanges(false);
              }}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              disabled={!hasChanges}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t.applyFilters}
            </Button>
          </div>

          {/* Active Filter Summary */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
              {filters.skillLevel && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">
                  Skill: {filters.skillLevel.min || 1}-{filters.skillLevel.max || 10}
                </Badge>
              )}
              {filters.location?.city && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                  {filters.location.city} ({filters.location.radius}km)
                </Badge>
              )}
              {filters.preferredHand && filters.preferredHand !== 'both' && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-400">
                  {t.preferredHand}: {t[filters.preferredHand]}
                </Badge>
              )}
              {filters.ageRange && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-400">
                  Age: {filters.ageRange.min || 18}-{filters.ageRange.max || 80}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
