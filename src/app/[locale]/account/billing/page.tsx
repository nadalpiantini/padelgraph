// Sprint 5 Phase 2: Account Billing Page
// User's billing management and subscription details

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Shield,
  Award,
  Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import { toast } from '@/hooks/use-toast';

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  price_amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  paypal_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UsageStats {
  tournaments: { used: number; limit: number };
  auto_matches: { used: number; limit: number };
  recommendations: { used: number; limit: number };
  travel_plans: { used: number; limit: number };
  plan: string;
  period: { start: Date; end: Date };
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description: string;
}

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth');
        return;
      }

      // Load subscription data
      const { data: sub } = await supabase
        .from('subscription')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sub) {
        setSubscription(sub);
      }

      // Load usage stats
      const usageResponse = await fetch('/api/usage/stats');
      if (usageResponse.ok) {
        const stats = await usageResponse.json();
        setUsageStats(stats);
      }

      // Load payment history
      const { data: payments } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (payments) {
        setPaymentHistory(payments);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    if (!subscription || subscription.status !== 'active') return;

    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of the current billing period.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User requested cancellation',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Subscription Cancelled',
          description: 'Your subscription has been cancelled. You will retain access until the end of the billing period.',
        });
        await loadBillingData();
      } else {
        throw new Error('Cancellation failed');
      }
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivateSubscription() {
    if (!subscription || subscription.status !== 'cancelled' || !subscription.cancel_at_period_end) return;

    setReactivating(true);
    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast({
          title: 'Subscription Reactivated',
          description: 'Your subscription has been reactivated successfully.',
        });
        await loadBillingData();
      } else {
        throw new Error('Reactivation failed');
      }
    } catch (error) {
      toast({
        title: 'Reactivation Failed',
        description: 'Failed to reactivate subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setReactivating(false);
    }
  }

  async function handleUpgrade() {
    router.push('/pricing');
  }

  async function downloadInvoice(paymentId: string) {
    try {
      const response = await fetch(`/api/invoices/${paymentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${paymentId}.pdf`;
        a.click();
      }
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download invoice',
        variant: 'destructive',
      });
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'past_due':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'suspended':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'past_due':
        return 'secondary';
      case 'suspended':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  function getPlanIcon(plan: string) {
    switch (plan) {
      case 'pro':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'premium':
        return <Award className="h-5 w-5 text-purple-500" />;
      case 'club':
        return <Shield className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  }

  function calculateUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>Manage your subscription and billing details</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlanIcon(subscription.plan)}
                    <div>
                      <p className="text-lg font-semibold capitalize">{subscription.plan} Plan</p>
                      <p className="text-sm text-muted-foreground">
                        ${subscription.price_amount}/{subscription.currency}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(subscription.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(subscription.status)}
                      {subscription.status}
                    </span>
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Period</p>
                    <p className="font-medium">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Payment</p>
                    <p className="font-medium">
                      {subscription.cancel_at_period_end ? 'Cancelled' : formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm">
                        Your subscription will end on {formatDate(subscription.current_period_end)}.
                        You can reactivate anytime before then.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You are currently on the Free plan</p>
                <Button onClick={handleUpgrade}>
                  Upgrade to Pro
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
          {subscription && (
            <CardFooter className="flex gap-2">
              {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <>
                  <Button onClick={handleUpgrade} variant="default">
                    Change Plan
                  </Button>
                  <Button onClick={handleCancelSubscription} variant="outline" disabled={cancelling}>
                    {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                  </Button>
                </>
              )}
              {subscription.cancel_at_period_end && (
                <Button onClick={handleReactivateSubscription} disabled={reactivating}>
                  {reactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Track your feature usage</CardDescription>
          </CardHeader>
          <CardContent>
            {usageStats ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tournaments</span>
                    <span>
                      {usageStats.tournaments.used}/{usageStats.tournaments.limit === -1 ? '∞' : usageStats.tournaments.limit}
                    </span>
                  </div>
                  <Progress
                    value={calculateUsagePercentage(usageStats.tournaments.used, usageStats.tournaments.limit)}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Auto-Matches</span>
                    <span>
                      {usageStats.auto_matches.used}/{usageStats.auto_matches.limit === -1 ? '∞' : usageStats.auto_matches.limit}
                    </span>
                  </div>
                  <Progress
                    value={calculateUsagePercentage(usageStats.auto_matches.used, usageStats.auto_matches.limit)}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Recommendations</span>
                    <span>
                      {usageStats.recommendations.used}/{usageStats.recommendations.limit === -1 ? '∞' : usageStats.recommendations.limit}
                    </span>
                  </div>
                  <Progress
                    value={calculateUsagePercentage(usageStats.recommendations.used, usageStats.recommendations.limit)}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Travel Plans</span>
                    <span>
                      {usageStats.travel_plans.used}/{usageStats.travel_plans.limit === -1 ? '∞' : usageStats.travel_plans.limit}
                    </span>
                  </div>
                  <Progress
                    value={calculateUsagePercentage(usageStats.travel_plans.used, usageStats.travel_plans.limit)}
                    className="h-2"
                  />
                </div>

                <Separator />

                <p className="text-xs text-muted-foreground text-center">
                  Resets on {formatDate(usageStats.period.end.toISOString())}
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No usage data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-2">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(payment.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">${payment.amount}</p>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadInvoice(payment.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No payment history available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}