// Sprint 5: Current Subscription API
// GET /api/subscriptions/current

import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription, getPlanLimits } from '@/lib/services/subscriptions';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
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

    const subscription = await getUserSubscription(user.id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const limits = getPlanLimits(subscription.plan);

    return NextResponse.json({
      subscription,
      limits,
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
