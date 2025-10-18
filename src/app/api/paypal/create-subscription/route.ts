// Sprint 5: PayPal Create Subscription API
// POST /api/paypal/create-subscription

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_PLAN_IDS = {
  pro: process.env.PAYPAL_PRO_PLAN_ID || '',
  dual: process.env.PAYPAL_DUAL_PLAN_ID || '',
  premium: process.env.PAYPAL_PREMIUM_PLAN_ID || '',
  club: process.env.PAYPAL_CLUB_PLAN_ID || '',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan_id } = body;

    // Validate plan (free, pro, dual, premium, club)
    if (!['pro', 'dual', 'premium', 'club'].includes(plan_id)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const paypalPlanId = PAYPAL_PLAN_IDS[plan_id as keyof typeof PAYPAL_PLAN_IDS];

    if (!paypalPlanId) {
      return NextResponse.json(
        { error: 'Plan not configured' },
        { status: 500 }
      );
    }

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

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create subscription
    const subscriptionResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan_id: paypalPlanId,
          subscriber: {
            email_address: user.email,
          },
          application_context: {
            brand_name: 'PadelGraph',
            locale: 'en-US',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/billing?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?cancelled=true`,
          },
        }),
      }
    );

    const subscriptionData = await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      console.error('PayPal subscription creation failed:', subscriptionData);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Find approval URL
    const approvalUrl = subscriptionData.links?.find(
      (link: { rel: string; href: string }) => link.rel === 'approve'
    )?.href;

    if (!approvalUrl) {
      return NextResponse.json(
        { error: 'No approval URL returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscription_id: subscriptionData.id,
      approval_url: approvalUrl,
    });
  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
