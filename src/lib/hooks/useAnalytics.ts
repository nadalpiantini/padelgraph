/**
 * Analytics React Hook
 * Sprint 5 Phase 3: Client-side analytics tracking
 */

'use client';

import { useContext } from 'react';
import { AnalyticsContext } from '@/lib/providers/AnalyticsProvider';

export function useAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }

  return context;
}
