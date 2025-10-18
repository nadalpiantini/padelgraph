/**
 * Change Subscription Plan API
 * POST /api/subscriptions/change-plan
 *
 * Allows users to upgrade or downgrade their subscription plan
 * Upgrades take effect immediately with proration
 * Downgrades take effect at period end
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { sendPayPalNotification, getUserLocale } from '@/lib/email-templates/paypal-notifications';

// PayPal API configuration
const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// PayPal Plan ID mapping
const PLAN_IDS = {
  pro: process.env.PAYPAL_PRO_PLAN_ID || 'P-8DF61561CK131203HNDZLZVQ',
  dual: process.env.PAYPAL_DUAL_PLAN_ID || 'P-3R001407AKS44845TNDZLY7',
  premium: process.env.PAYPAL_PREMIUM_PLAN_ID || 'P-88023967WE506663ENDZN2QQ',
  club: process.env.PAYPAL_CLUB_PLAN_ID || 'P-1EVQ6856ST196634TNDZN46A',
} as const;

// Plan tier hierarchy for upgrade/downgrade detection
const PLAN_TIERS = {
  free: 0,
  pro: 1,
  dual: 2,
  premium: 3,
  club: 4,
};

type PlanType = keyof typeof PLAN_IDS;

async function getPayPalAccessToken(): Promise<string> {
  const authResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!authResponse.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const authData = await authResponse.json();
  return authData.access_token;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { new_plan } = body;

    if (!new_plan || !PLAN_IDS[new_plan as PlanType]) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be: pro, dual, premium, or club' },
        { status: 400 }
      );
    }

    // Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe first.' },
        { status: 404 }
      );
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot change plan. Subscription status is: ${subscription.status}` },
        { status: 400 }
      );
    }

    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'No PayPal subscription ID found' },
        { status: 400 }
      );
    }

    // Check if already on requested plan
    if (subscription.plan === new_plan) {
      return NextResponse.json(
        { error: `Already on ${new_plan} plan` },
        { status: 400 }
      );
    }

    // Determine if upgrade or downgrade
    const currentTier = PLAN_TIERS[subscription.plan as keyof typeof PLAN_TIERS] || 0;
    const newTier = PLAN_TIERS[new_plan as keyof typeof PLAN_TIERS] || 0;
    const isUpgrade = newTier > currentTier;

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Get new plan ID from PayPal
    const newPayPalPlanId = PLAN_IDS[new_plan as PlanType];

    // Update subscription plan via PayPal API
    const updateResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/revise`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan_id: newPayPalPlanId,
          // Upgrades take effect immediately, downgrades at period end
          application_context: {
            shipping_preference: 'NO_SHIPPING',
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      log.error('PayPal plan change failed', {
        error: errorData,
        userId: user.id,
        currentPlan: subscription.plan,
        newPlan: new_plan,
      });
      return NextResponse.json(
        { error: 'Failed to change plan with PayPal' },
        { status: 500 }
      );
    }

    const revisionData = await updateResponse.json();

    // Update local database
    const updateData: Record<string, unknown> = {
      paypal_plan_id: newPayPalPlanId,
      updated_at: new Date().toISOString(),
    };

    // For upgrades, update plan immediately
    if (isUpgrade) {
      updateData.plan = new_plan;
    } else {
      // For downgrades, schedule for period end
      updateData.pending_plan = new_plan;
    }

    const { error: updateError } = await supabase
      .from('subscription')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      log.error('Failed to update subscription plan', {
        error: updateError,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // For upgrades, update user_profile immediately
    if (isUpgrade) {
      const { error: profileError } = await supabase
        .from('user_profile')
        .update({ current_plan: new_plan })
        .eq('user_id', user.id);

      if (profileError) {
        log.error('Failed to update user profile plan', {
          error: profileError,
          userId: user.id,
        });
        // Non-critical, continue
      }
    }

    log.info('Subscription plan changed', {
      userId: user.id,
      oldPlan: subscription.plan,
      newPlan: new_plan,
      isUpgrade,
      effectiveDate: isUpgrade ? 'immediately' : subscription.current_period_end,
    });

    // Send plan change confirmation email
    try {
      const { data: profile } = await supabase
        .from('user_profile')
        .select('name, email')
        .eq('user_id', user.id)
        .single();

      if (profile?.email) {
        const locale = await getUserLocale(user.id);

        const effectiveDate = isUpgrade
          ? 'immediately'
          : subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString(
              locale === 'es' ? 'es-ES' : 'en-US'
            )
          : 'end of billing period';

        // Use subscriptionActivated for upgrades, custom message for downgrades
        const emailType = isUpgrade ? 'subscriptionActivated' : 'subscriptionCancelled';

        await sendPayPalNotification(
          emailType,
          profile.email,
          {
            name: profile.name || 'PadelGraph Player',
            plan: new_plan.charAt(0).toUpperCase() + new_plan.slice(1),
            nextBillingDate: effectiveDate,
            expiryDate: effectiveDate,
          },
          locale
        );
      }
    } catch (emailError) {
      log.error('Failed to send plan change email', {
        error: emailError,
        userId: user.id,
      });
      // Email failure shouldn't fail the plan change
    }

    return NextResponse.json({
      success: true,
      message: `Plan ${isUpgrade ? 'upgraded' : 'downgraded'} successfully`,
      old_plan: subscription.plan,
      new_plan,
      effective_date: isUpgrade ? 'immediately' : subscription.current_period_end,
      is_upgrade: isUpgrade,
      revision_id: revisionData.id,
    });
  } catch (error) {
    log.error('Error changing subscription plan', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
