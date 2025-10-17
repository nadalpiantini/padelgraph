// Sprint 5 Phase 2: Change Subscription Plan API
// POST /api/subscriptions/change-plan

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// PayPal Plan ID mapping
const PAYPAL_PLAN_IDS = {
  pro: process.env.PAYPAL_PRO_PLAN_ID!,
  premium: process.env.PAYPAL_PREMIUM_PLAN_ID!,
  club: process.env.PAYPAL_CLUB_PLAN_ID!,
};

// Plan hierarchy for upgrade/downgrade logic
const PLAN_HIERARCHY = {
  free: 0,
  pro: 1,
  premium: 2,
  club: 3,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { new_plan, immediate = false } = body;

    // Validate new plan
    if (!new_plan || !['pro', 'premium', 'club'].includes(new_plan)) {
      return NextResponse.json(
        { error: 'Invalid plan specified. Must be pro, premium, or club.' },
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
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active. Cannot change plan.' },
        { status: 400 }
      );
    }

    // Check if already on the requested plan
    if (subscription.plan === new_plan) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      );
    }

    // Verify PayPal subscription exists
    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'PayPal subscription ID not found' },
        { status: 400 }
      );
    }

    // Determine if this is an upgrade or downgrade
    const currentLevel = PLAN_HIERARCHY[subscription.plan as keyof typeof PLAN_HIERARCHY];
    const newLevel = PLAN_HIERARCHY[new_plan as keyof typeof PLAN_HIERARCHY];
    const isUpgrade = newLevel > currentLevel;

    // Get PayPal access token
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
      log.error('Failed to get PayPal access token', { status: authResponse.status });
      return NextResponse.json(
        { error: 'Failed to connect to PayPal' },
        { status: 500 }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Get new plan ID
    const newPlanId = PAYPAL_PLAN_IDS[new_plan as keyof typeof PAYPAL_PLAN_IDS];
    if (!newPlanId) {
      log.error('PayPal plan ID not configured', { plan: new_plan });
      return NextResponse.json(
        { error: 'Plan not properly configured' },
        { status: 500 }
      );
    }

    // Determine effective date (immediate for upgrades, end of period for downgrades by default)
    const effectiveTime = isUpgrade || immediate ? 'IMMEDIATE' : 'NEXT_BILLING_CYCLE';

    // Update PayPal subscription
    const updateResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/revise`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan_id: newPlanId,
          application_context: {
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?upgrade=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?upgrade=cancelled`,
          },
          plan: {
            billing_cycles: [
              {
                sequence: 1,
                pricing_scheme: {
                  version: 1,
                  fixed_price: {
                    currency_code: 'EUR',
                    value: new_plan === 'pro' ? '9.00' : new_plan === 'premium' ? '19.00' : '49.00',
                  },
                },
              },
            ],
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      log.error('Failed to update PayPal subscription', {
        status: updateResponse.status,
        error: errorData,
      });

      // Try alternative approach: cancel current and create new
      if (updateResponse.status === 422 || updateResponse.status === 400) {
        return NextResponse.json({
          success: false,
          requiresNewSubscription: true,
          message: 'Plan change requires creating a new subscription. Please cancel your current plan and subscribe to the new one.',
          instructions: {
            step1: 'Cancel your current subscription',
            step2: 'Wait for current period to end or cancel immediately',
            step3: 'Subscribe to the new plan from the pricing page',
          },
        });
      }

      return NextResponse.json(
        { error: 'Failed to change subscription plan with PayPal' },
        { status: 500 }
      );
    }

    // Update local subscription record
    const updateData: {
      plan: string;
      paypal_plan_id: string;
      updated_at: string;
      plan_change_date?: string;
      pending_plan?: string;
      pending_plan_date?: string;
    } = {
      plan: new_plan,
      paypal_plan_id: newPlanId,
      updated_at: new Date().toISOString(),
    };

    // If immediate upgrade, update plan immediately
    if (effectiveTime === 'IMMEDIATE') {
      updateData.plan_change_date = new Date().toISOString();
    } else {
      // For downgrades, schedule change for next billing cycle
      updateData.pending_plan = new_plan;
      updateData.pending_plan_date = subscription.current_period_end;
    }

    await supabase
      .from('subscription')
      .update(updateData)
      .eq('user_id', user.id);

    // Update user profile if immediate
    if (effectiveTime === 'IMMEDIATE') {
      await supabase
        .from('user_profile')
        .update({ current_plan: new_plan })
        .eq('id', user.id);
    }

    // Send email notification
    try {
      const emailSubject = isUpgrade ? 'Subscription Upgraded' : 'Subscription Plan Change Scheduled';
      const emailTemplate = isUpgrade ? 'subscription-upgraded' : 'subscription-downgraded';

      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: emailSubject,
          template: emailTemplate,
          data: {
            oldPlan: subscription.plan,
            newPlan: new_plan,
            effectiveDate: effectiveTime === 'IMMEDIATE'
              ? new Date().toISOString()
              : subscription.current_period_end,
            isImmediate: effectiveTime === 'IMMEDIATE',
          },
        }),
      });

      if (!emailResponse.ok) {
        log.warn('Failed to send plan change email', { userId: user.id });
      }
    } catch (error) {
      log.error('Error sending plan change email', { error });
    }

    log.info('Subscription plan changed', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
      oldPlan: subscription.plan,
      newPlan: new_plan,
      effectiveTime,
    });

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? 'Subscription upgraded successfully'
        : 'Subscription change scheduled for next billing cycle',
      subscription: {
        current_plan: effectiveTime === 'IMMEDIATE' ? new_plan : subscription.plan,
        new_plan: effectiveTime === 'IMMEDIATE' ? null : new_plan,
        change_effective: effectiveTime === 'IMMEDIATE'
          ? new Date().toISOString()
          : subscription.current_period_end,
        is_immediate: effectiveTime === 'IMMEDIATE',
      },
    });
  } catch (error) {
    log.error('Error changing subscription plan', { error });
    return NextResponse.json(
      { error: 'Failed to change subscription plan' },
      { status: 500 }
    );
  }
}