// Sprint 5 Phase 2: Pricing Page
// Display subscription plans and handle PayPal subscription creation

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Users, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

interface PlanFeature {
  name: string;
  included: boolean;
  value?: string | number;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  popular?: boolean;
  features: PlanFeature[];
  paypalPlanId: string;
  color: string;
  icon: React.ReactNode;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for casual players',
    price: 0,
    currency: 'USD',
    interval: 'month',
    paypalPlanId: '',
    color: 'border-gray-200',
    icon: <Users className="h-6 w-6" />,
    features: [
      { name: 'Tournament Creation', included: true, value: '2/month' },
      { name: 'Auto-Match', included: true, value: '5/month' },
      { name: 'Player Recommendations', included: true, value: '10/month' },
      { name: 'Travel Plans', included: true, value: '1/month' },
      { name: 'Advanced Analytics', included: false },
      { name: 'Achievement System', included: true },
      { name: 'Leaderboards', included: true },
      { name: 'Ad-Free Experience', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For serious padel enthusiasts',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    popular: true,
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO || '',
    color: 'border-blue-500',
    icon: <Zap className="h-6 w-6 text-blue-500" />,
    features: [
      { name: 'Tournament Creation', included: true, value: 'Unlimited' },
      { name: 'Auto-Match', included: true, value: '50/month' },
      { name: 'Player Recommendations', included: true, value: 'Unlimited' },
      { name: 'Travel Plans', included: true, value: '10/month' },
      { name: 'Advanced Analytics', included: true },
      { name: 'Achievement System', included: true },
      { name: 'Leaderboards', included: true },
      { name: 'Ad-Free Experience', included: true },
    ],
  },
  {
    id: 'dual',
    name: 'Dual',
    description: 'Perfect for couples & families',
    price: 15.00,
    currency: 'USD',
    interval: 'month',
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_DUAL || '',
    color: 'border-pink-500',
    icon: <Users className="h-6 w-6 text-pink-500" />,
    features: [
      { name: 'All Pro Features', included: true },
      { name: 'Family Invitations (2 Users)', included: true },
      { name: 'Unlimited Auto-Match', included: true },
      { name: 'Unlimited Travel Plans', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Shared Analytics Dashboard', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For professional players',
    price: 15.00,
    currency: 'USD',
    interval: 'month',
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM || '',
    color: 'border-purple-500',
    icon: <Crown className="h-6 w-6 text-purple-500" />,
    features: [
      { name: 'All Pro Features', included: true },
      { name: 'Unlimited Auto-Match', included: true },
      { name: 'Unlimited Travel Plans', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Custom Tournament Branding', included: true },
      { name: 'API Access', included: true },
    ],
  },
];

export default function PricingPage() {
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
        title: 'Free Plan',
        description: 'You are already on the free plan',
      });
      return;
    }

    if (plan.id === currentPlan) {
      toast({
        title: 'Current Plan',
        description: 'You are already subscribed to this plan',
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
        title: 'Subscription Failed',
        description: 'Failed to create subscription. Please try again.',
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
          <h1 className="text-4xl font-bold mb-4">Choose Your Perfect Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of PadelGraph with our premium features.
            Start with Free and upgrade anytime.
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
                    Most Popular
                  </Badge>
                </div>
              )}

              {plan.id === currentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="default">Current Plan</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {plan.icon}
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </div>
                    {plan.price > 0 && (
                      <div className="text-sm text-muted-foreground">/{plan.interval}</div>
                    )}
                  </div>
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <span className={`text-sm ${!feature.included ? 'text-muted-foreground' : ''}`}>
                        <span className="font-medium">{feature.name}</span>
                        {feature.value && <span className="text-muted-foreground"> - {feature.value}</span>}
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
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? (
                      'Processing...'
                    ) : plan.price === 0 ? (
                      'Get Started'
                    ) : plan.id < currentPlan ? (
                      'Downgrade'
                    ) : (
                      'Upgrade'
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately,
                  while downgrades apply at the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards, PayPal, and bank transfers through our secure
                  PayPal payment processing system.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our Free plan lets you try core features without any time limit. You can upgrade
                  to access premium features when you&apos;re ready.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel my subscription?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes, you can cancel your subscription at any time from your account settings.
                  You&apos;ll retain access until the end of your billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}