// Sprint 5 Phase 2: Pricing Page
// Display subscription plans and handle PayPal subscription creation

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/routing';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

interface Plan {
  id: string;
  price: number;
  currency: string;
  interval: string;
  popular?: boolean;
  paypalPlanId: string;
  color: string;
  icon: React.ReactNode;
}

const plans: Plan[] = [
  {
    id: 'free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    paypalPlanId: '',
    color: 'border-gray-200',
    icon: <Users className="h-6 w-6" />,
  },
  {
    id: 'pro',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    popular: true,
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO || '',
    color: 'border-blue-500',
    icon: <Zap className="h-6 w-6 text-blue-500" />,
  },
  {
    id: 'dual',
    price: 15.00,
    currency: 'USD',
    interval: 'month',
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_DUAL || '',
    color: 'border-pink-500',
    icon: <Users className="h-6 w-6 text-pink-500" />,
  },
  {
    id: 'premium',
    price: 15.00,
    currency: 'USD',
    interval: 'month',
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM || '',
    color: 'border-purple-500',
    icon: <Crown className="h-6 w-6 text-purple-500" />,
  },
];

// Feature keys for each plan (stable keys for translation)
const planFeatures = {
  free: [
    'tournamentCreation',
    'autoMatch',
    'playerRecommendations',
    'travelPlans',
    'rankings',
    'socialFeed',
    'courtBooking',
    'achievements',
  ],
  pro: [
    'tournamentCreation',
    'autoMatch',
    'playerRecommendations',
    'travelPlans',
    'advancedAnalytics',
    'prioritySupport',
    'customProfile',
    'videoHighlights',
    'earlyAccess',
  ],
  dual: [
    'twoAccounts',
    'tournamentCreation',
    'autoMatch',
    'sharedAnalytics',
    'doublesPairTracking',
    'familySavings',
  ],
  premium: [
    'tournamentCreation',
    'autoMatch',
    'playerRecommendations',
    'travelPlans',
    'dedicatedSupport',
    'coachingInsights',
    'videoAnalysis',
    'tournamentHistory',
    'apiAccess',
  ],
} as const;

export default function PricingPage() {
  const t = useTranslations('pricing');
  const router = useRouter();
  const supabase = createClient();
  const analytics = useAnalytics();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  // const [loading, setLoading] = useState(false); // Unused for now
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUserAndPlan();

    // Track pricing page view
    analytics.trackPricingViewed();
  }, []);

  async function loadUserAndPlan() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        // Set user ID for analytics
        analytics.setUserId(user.id);

        // Get current subscription
        const { data: subscription } = await supabase
          .from('subscription')
          .select('plan')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subscription) {
          setCurrentPlan(subscription.plan);
        }
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
    }
  }

  async function handleSubscribe(plan: Plan) {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    if (plan.id === 'free') {
      toast({
        title: t('toasts.freePlan.title'),
        description: t('toasts.freePlan.message'),
      });
      return;
    }

    if (plan.id === currentPlan) {
      toast({
        title: t('toasts.currentPlan.title'),
        description: t('toasts.currentPlan.message'),
      });
      return;
    }

    setLoadingPlan(plan.id);

    try {
      // Track plan selection
      analytics.trackPlanSelected(plan.id);

      // Track checkout initiation
      analytics.trackCheckoutInitiated(plan.id);

      // Create PayPal subscription
      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const { approval_url } = await response.json();

      // Redirect to PayPal for approval
      window.location.href = approval_url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: t('toasts.subscriptionFailed.title'),
        description: t('toasts.subscriptionFailed.message'),
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handleManageSubscription() {
    router.push('/account/billing');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-16 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? 'border-2 shadow-xl' : ''} ${
                plan.id === currentPlan ? 'ring-2 ring-primary' : ''
              } ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    {t('badges.mostPopular')}
                  </Badge>
                </div>
              )}

              {plan.id === currentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="default">{t('badges.currentPlan')}</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {plan.icon}
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {plan.price === 0 ? t('plans.free.name') : `$${plan.price}`}
                    </div>
                    {plan.price > 0 && (
                      <div className="text-sm text-muted-foreground">/{plan.interval}</div>
                    )}
                  </div>
                </div>
                <CardTitle>{t(`plans.${plan.id}.name`)}</CardTitle>
                <CardDescription>{t(`plans.${plan.id}.description`)}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {planFeatures[plan.id as keyof typeof planFeatures].map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        {t(`plans.${plan.id}.features.${featureKey}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {plan.id === currentPlan ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleManageSubscription}
                  >
                    {t('buttons.manageSubscription')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      t('buttons.processing')
                    ) : plan.price === 0 ? (
                      t('buttons.getStarted')
                    ) : plan.id < currentPlan ? (
                      t('buttons.downgrade')
                    ) : (
                      t('buttons.upgrade')
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t('faq.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{t(`faq.questions.${index}.question`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(`faq.questions.${index}.answer`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}