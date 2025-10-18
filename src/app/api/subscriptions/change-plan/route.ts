/**
 * Change Subscription Plan Endpoint
 * POST /api/subscriptions/change-plan
 *
 * Allows users to upgrade or downgrade their subscription plan
 * - Upgrades: Immediate effect with proration
 * - Downgrades: Take effect at end of billing period
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paypalClient } from '@/lib/services/paypal-client';
import { getUserLocale } from '@/lib/email-templates/paypal-notifications';
import { log } from '@/lib/logger';
import { emailService } from '@/lib/email';

// Plan hierarchy for upgrade/downgrade detection
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  dual: 2,
  premium: 2, // Same tier as dual
  club: 3,
};

// PayPal Plan IDs mapping
const PAYPAL_PLAN_IDS: Record<string, string> = {
  pro: process.env.PAYPAL_PLAN_ID_PRO || 'P-8DF61561CK131203HNDZLZVQ',
  dual: process.env.PAYPAL_PLAN_ID_DUAL || 'P-3R001407AKS44845TNDZLY7',
  premium: process.env.PAYPAL_PLAN_ID_PREMIUM || 'P-88023967WE506663ENDZN2QQ',
  club: process.env.PAYPAL_PLAN_ID_CLUB || 'P-1EVQ6856ST196634TNDZN46A',
};

interface ChangePlanRequest {
  newPlan: 'pro' | 'dual' | 'premium' | 'club';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: ChangePlanRequest = await request.json();

    if (!body.newPlan || !PAYPAL_PLAN_IDS[body.newPlan]) {
      return NextResponse.json(
        { error: 'Invalid plan specified', validPlans: Object.keys(PAYPAL_PLAN_IDS) },
        { status: 400 }
      );
    }

    // 3. Get user's current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        {
          error: 'No active subscription found',
          hint: 'Please create a new subscription from the pricing page',
        },
        { status: 404 }
      );
    }

    if (!subscription.paypal_subscription_id) {
      return NextResponse.json(
        { error: 'Subscription not linked to PayPal' },
        { status: 400 }
      );
    }

    // 4. Check if plan is changing
    const currentPlan = subscription.plan;
    if (currentPlan === body.newPlan) {
      return NextResponse.json({ error: 'You are already on this plan' }, { status: 400 });
    }

    // 5. Determine if upgrade or downgrade
    const currentTier = PLAN_HIERARCHY[currentPlan] || 0;
    const newTier = PLAN_HIERARCHY[body.newPlan] || 0;
    const isUpgrade = newTier > currentTier;

    log.info('Changing subscription plan', {
      userId: user.id,
      currentPlan,
      newPlan: body.newPlan,
      isUpgrade,
    });

    // 6. Get new PayPal plan ID
    const newPayPalPlanId = PAYPAL_PLAN_IDS[body.newPlan];

    // 7. Call PayPal API to update subscription plan
    await paypalClient.updateSubscriptionPlan(subscription.paypal_subscription_id, newPayPalPlanId);

    // 8. Update local database
    const updateData: Record<string, any> = {
      paypal_plan_id: newPayPalPlanId,
      plan: body.newPlan,
      updated_at: new Date().toISOString(),
    };

    if (!isUpgrade) {
      updateData.pending_plan_change = body.newPlan;
    }

    const { error: updateError } = await supabase
      .from('subscription')
      .update(updateData)
      .eq('id', subscription.id);

    if (updateError) {
      log.error('Failed to update subscription in database', { error: updateError });
      throw new Error('Database update failed');
    }

    // 9. Update user current plan in profile (for immediate feature gating)
    if (isUpgrade) {
      await supabase.from('user_profile').update({ current_plan: body.newPlan }).eq('user_id', user.id);
    }

    // 10. Get user profile for email notification
    const { data: profile } = await supabase
      .from('user_profile')
      .select('name, email, preferred_language')
      .eq('user_id', user.id)
      .single();

    // 11. Send plan change confirmation email
    if (profile?.email) {
      const locale = await getUserLocale(user.id);

      const subject = isUpgrade
        ? locale === 'es'
          ? `Mejoraste a ${body.newPlan.toUpperCase()}`
          : `You upgraded to ${body.newPlan.toUpperCase()}`
        : locale === 'es'
          ? `Cambio de plan a ${body.newPlan.toUpperCase()}`
          : `Plan change to ${body.newPlan.toUpperCase()}`;

      const effectiveDate = isUpgrade
        ? 'immediately'
        : subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString(
              locale === 'es' ? 'es-ES' : 'en-US'
            )
          : 'end of billing period';

      const html =
        locale === 'es'
          ? `<h2>Hola ${profile.name || 'PadelGraph Player'},</h2><p>Tu plan ha sido ${isUpgrade ? 'mejorado' : 'cambiado'} a <strong>${body.newPlan.toUpperCase()}</strong>.</p><p><strong>Efectivo:</strong> ${isUpgrade ? 'Inmediatamente' : effectiveDate}</p>${isUpgrade ? '<p>Disfruta de tus nuevas funciones premium</p>' : '<p>El cambio se aplicara al final de tu periodo de facturacion actual.</p>'}<a href="https://padelgraph.com/account/billing">Ver Detalles</a>`
          : `<h2>Hi ${profile.name || 'PadelGraph Player'},</h2><p>Your plan has been ${isUpgrade ? 'upgraded' : 'changed'} to <strong>${body.newPlan.toUpperCase()}</strong>.</p><p><strong>Effective:</strong> ${isUpgrade ? 'Immediately' : effectiveDate}</p>${isUpgrade ? '<p>Enjoy your new premium features</p>' : '<p>The change will apply at the end of your current billing period.</p>'}<a href="https://padelgraph.com/account/billing">View Details</a>`;

      await emailService.send({
        to: profile.email,
        subject,
        html,
      });
    }

    log.info('Subscription plan changed successfully', {
      userId: user.id,
      subscriptionId: subscription.paypal_subscription_id,
      oldPlan: currentPlan,
      newPlan: body.newPlan,
      isUpgrade,
    });

    return NextResponse.json({
      success: true,
      message: `Subscription ${isUpgrade ? 'upgraded' : 'downgraded'} successfully`,
      plan: body.newPlan,
      effectiveDate: isUpgrade ? 'immediate' : subscription.current_period_end,
      isUpgrade,
    });
  } catch (error) {
    log.error('Error changing subscription plan', { error });

    return NextResponse.json(
      {
        error: 'Failed to change subscription plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
