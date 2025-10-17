/**
 * Analytics Provider
 * Sprint 5 Phase 3: Global analytics context
 */

'use client';

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  trackPageView,
  trackClientEvent,
  trackTournamentViewed,
  trackTournamentRegistered,
  trackPricingViewed,
  trackPlanSelected,
  trackCheckoutInitiated,
  trackPostCreated,
  trackPostLiked,
  trackCommentAdded,
  trackRecommendationClicked,
  trackProfileCompleted,
} from '@/lib/utils/analytics-client';

export interface AnalyticsContextValue {
  userId?: string;
  setUserId: (userId: string | undefined) => void;
  track: (eventName: string, properties?: Record<string, unknown>) => Promise<void>;
  trackPageView: () => Promise<void>;
  trackTournamentViewed: (tournamentId: string) => Promise<void>;
  trackTournamentRegistered: (tournamentId: string) => Promise<void>;
  trackPricingViewed: () => Promise<void>;
  trackPlanSelected: (plan: string) => Promise<void>;
  trackCheckoutInitiated: (plan: string) => Promise<void>;
  trackPostCreated: (postId: string) => Promise<void>;
  trackPostLiked: (postId: string) => Promise<void>;
  trackCommentAdded: (postId: string, commentId: string) => Promise<void>;
  trackRecommendationClicked: (recommendedUserId: string) => Promise<void>;
  trackProfileCompleted: () => Promise<void>;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [userId, setUserId] = useState<string | undefined>();
  const pathname = usePathname();

  // Track page views on navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackPageView(userId);
    }
  }, [pathname, userId]);

  const track = async (eventName: string, properties?: Record<string, unknown>) => {
    await trackClientEvent({
      event_name: eventName,
      user_id: userId,
      properties,
    });
  };

  const trackPageViewFn = async () => {
    await trackPageView(userId);
  };

  const trackTournamentViewedFn = async (tournamentId: string) => {
    await trackTournamentViewed(tournamentId, userId);
  };

  const trackTournamentRegisteredFn = async (tournamentId: string) => {
    if (!userId) {
      console.warn('Cannot track tournament registration without userId');
      return;
    }
    await trackTournamentRegistered(tournamentId, userId);
  };

  const trackPricingViewedFn = async () => {
    await trackPricingViewed(userId);
  };

  const trackPlanSelectedFn = async (plan: string) => {
    await trackPlanSelected(plan, userId);
  };

  const trackCheckoutInitiatedFn = async (plan: string) => {
    await trackCheckoutInitiated(plan, userId);
  };

  const trackPostCreatedFn = async (postId: string) => {
    if (!userId) {
      console.warn('Cannot track post creation without userId');
      return;
    }
    await trackPostCreated(postId, userId);
  };

  const trackPostLikedFn = async (postId: string) => {
    if (!userId) {
      console.warn('Cannot track post like without userId');
      return;
    }
    await trackPostLiked(postId, userId);
  };

  const trackCommentAddedFn = async (postId: string, commentId: string) => {
    if (!userId) {
      console.warn('Cannot track comment without userId');
      return;
    }
    await trackCommentAdded(postId, commentId, userId);
  };

  const trackRecommendationClickedFn = async (recommendedUserId: string) => {
    if (!userId) {
      console.warn('Cannot track recommendation click without userId');
      return;
    }
    await trackRecommendationClicked(recommendedUserId, userId);
  };

  const trackProfileCompletedFn = async () => {
    if (!userId) {
      console.warn('Cannot track profile completion without userId');
      return;
    }
    await trackProfileCompleted(userId);
  };

  const value: AnalyticsContextValue = {
    userId,
    setUserId,
    track,
    trackPageView: trackPageViewFn,
    trackTournamentViewed: trackTournamentViewedFn,
    trackTournamentRegistered: trackTournamentRegisteredFn,
    trackPricingViewed: trackPricingViewedFn,
    trackPlanSelected: trackPlanSelectedFn,
    trackCheckoutInitiated: trackCheckoutInitiatedFn,
    trackPostCreated: trackPostCreatedFn,
    trackPostLiked: trackPostLikedFn,
    trackCommentAdded: trackCommentAddedFn,
    trackRecommendationClicked: trackRecommendationClickedFn,
    trackProfileCompleted: trackProfileCompletedFn,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
