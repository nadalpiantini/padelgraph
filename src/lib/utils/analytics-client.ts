/**
 * Client-Side Analytics Utility
 * Sprint 5 Phase 3: Event tracking SDK
 */

import { EVENTS } from '@/lib/constants/analytics-events';

export interface TrackEventOptions {
  event_name: string;
  properties?: Record<string, unknown>;
  user_id?: string;
}

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
  platform: string;
}

/**
 * Generate or retrieve session ID from localStorage
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-side';

  const SESSION_KEY = 'padelgraph_session_id';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const stored = localStorage.getItem(SESSION_KEY);
  const storedTime = localStorage.getItem(`${SESSION_KEY}_time`);

  if (stored && storedTime) {
    const elapsed = Date.now() - parseInt(storedTime, 10);
    if (elapsed < SESSION_DURATION) {
      // Update timestamp
      localStorage.setItem(`${SESSION_KEY}_time`, Date.now().toString());
      return stored;
    }
  }

  // Generate new session ID
  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(`${SESSION_KEY}_time`, Date.now().toString());

  return sessionId;
}

/**
 * Get device information
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server-side',
      screenWidth: 0,
      screenHeight: 0,
      language: 'unknown',
      timezone: 'UTC',
      platform: 'server',
    };
  }

  return {
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
  };
}

/**
 * Track event on client-side
 */
export async function trackClientEvent(options: TrackEventOptions): Promise<void> {
  try {
    const sessionId = getSessionId();
    const deviceInfo = getDeviceInfo();

    const payload = {
      event_name: options.event_name,
      user_id: options.user_id || null,
      session_id: sessionId,
      properties: options.properties || {},
      page_url: window.location.href,
      referrer: document.referrer || null,
      device_info: deviceInfo,
    };

    // Send to API endpoint
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Silent fail - don't break user experience
    console.error('Analytics tracking error:', error);
  }
}

/**
 * Track page view
 */
export async function trackPageView(userId?: string): Promise<void> {
  await trackClientEvent({
    event_name: 'page_view',
    user_id: userId,
    properties: {
      path: window.location.pathname,
      title: document.title,
    },
  });
}

/**
 * Track user signup
 */
export async function trackUserSignup(userId: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.USER_SIGNED_UP,
    user_id: userId,
  });
}

/**
 * Track user login
 */
export async function trackUserLogin(userId: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.USER_LOGGED_IN,
    user_id: userId,
  });
}

/**
 * Track profile completion
 */
export async function trackProfileCompleted(userId: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.PROFILE_COMPLETED,
    user_id: userId,
  });
}

/**
 * Track tournament view
 */
export async function trackTournamentViewed(
  tournamentId: string,
  userId?: string
): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.TOURNAMENT_VIEWED,
    user_id: userId,
    properties: { tournament_id: tournamentId },
  });
}

/**
 * Track tournament registration
 */
export async function trackTournamentRegistered(
  tournamentId: string,
  userId: string
): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.TOURNAMENT_REGISTERED,
    user_id: userId,
    properties: { tournament_id: tournamentId },
  });
}

/**
 * Track pricing page view
 */
export async function trackPricingViewed(userId?: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.PRICING_VIEWED,
    user_id: userId,
  });
}

/**
 * Track plan selection
 */
export async function trackPlanSelected(plan: string, userId?: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.PLAN_SELECTED,
    user_id: userId,
    properties: { plan },
  });
}

/**
 * Track checkout initiation
 */
export async function trackCheckoutInitiated(plan: string, userId?: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.CHECKOUT_INITIATED,
    user_id: userId,
    properties: { plan },
  });
}

/**
 * Track post creation
 */
export async function trackPostCreated(postId: string, userId: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.POST_CREATED,
    user_id: userId,
    properties: { post_id: postId },
  });
}

/**
 * Track post like
 */
export async function trackPostLiked(postId: string, userId: string): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.POST_LIKED,
    user_id: userId,
    properties: { post_id: postId },
  });
}

/**
 * Track comment added
 */
export async function trackCommentAdded(
  postId: string,
  commentId: string,
  userId: string
): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.COMMENT_ADDED,
    user_id: userId,
    properties: { post_id: postId, comment_id: commentId },
  });
}

/**
 * Track recommendation click
 */
export async function trackRecommendationClicked(
  recommendedUserId: string,
  userId: string
): Promise<void> {
  await trackClientEvent({
    event_name: EVENTS.RECOMMENDATION_CLICKED,
    user_id: userId,
    properties: { recommended_user_id: recommendedUserId },
  });
}
