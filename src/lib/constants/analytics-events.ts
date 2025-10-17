/**
 * Analytics Events Constants
 * Sprint 5 Phase 3: Shared event names for analytics tracking
 *
 * IMPORTANT: This file has NO server dependencies to allow import from client components
 */

/**
 * Common events to track across the application
 */
export const EVENTS = {
  // User lifecycle
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  PROFILE_COMPLETED: 'profile_completed',

  // Feature usage
  TOURNAMENT_VIEWED: 'tournament_viewed',
  TOURNAMENT_REGISTERED: 'tournament_registered',
  MATCH_SCHEDULED: 'match_scheduled',
  AUTO_MATCH_TRIGGERED: 'auto_match_triggered',
  RECOMMENDATION_CLICKED: 'recommendation_clicked',
  TRAVEL_PLAN_CREATED: 'travel_plan_created',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',

  // Engagement
  POST_CREATED: 'post_created',
  POST_LIKED: 'post_liked',
  COMMENT_ADDED: 'comment_added',

  // Monetization
  PRICING_VIEWED: 'pricing_viewed',
  PLAN_SELECTED: 'plan_selected',
  CHECKOUT_INITIATED: 'checkout_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
} as const;
