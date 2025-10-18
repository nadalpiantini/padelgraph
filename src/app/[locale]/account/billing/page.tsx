// Sprint 5 Phase 2: Account Billing Page
// User's billing management and subscription details

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('account.billing');
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
        title: t('toasts.error.title'),
        description: t('toasts.error.loadingFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    if (!subscription || subscription.status !== 'active') return;

    if (!confirm(t('confirmations.cancelSubscription'))) {
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
          title: t('toasts.subscriptionCancelled.title'),
          description: t('toasts.subscriptionCancelled.message'),
        });
        await loadBillingData();
      } else {
        throw new Error('Cancellation failed');
      }
    } catch (error) {
      toast({
        title: t('toasts.cancellationFailed.title'),
        description: t('toasts.cancellationFailed.message'),
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
          title: t('toasts.subscriptionReactivated.title'),
          description: t('toasts.subscriptionReactivated.message'),
        });
        await loadBillingData();
      } else {
        throw new Error('Reactivation failed');
      }
    } catch (error) {
      toast({
        title: t('toasts.reactivationFailed.title'),
        description: t('toasts.reactivationFailed.message'),
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
        title: t('toasts.downloadFailed.title'),
        description: t('toasts.downloadFailed.message'),
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
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('currentSubscription.title')}</CardTitle>
            <CardDescription>{t('currentSubscription.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlanIcon(subscription.plan)}
                    <div>
                      <p className="text-lg font-semibold capitalize">{subscription.plan} {t('currentSubscription.planSuffix')}</p>
                      <p className="text-sm text-muted-foreground">
                        ${subscription.price_amount}/{subscription.currency}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(subscription.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(subscription.status)}
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
                    </span>
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('currentSubscription.currentPeriod')}</p>
                    <p className="font-medium">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('currentSubscription.nextPayment')}</p>
                    <p className="font-medium">
                      {subscription.cancel_at_period_end ? t('currentSubscription.cancelled') : formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>

                {subscription.cancel_at_period_end && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm">
                        {t('currentSubscription.cancellationWarning', { date: formatDate(subscription.current_period_end) })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t('currentSubscription.freePlanMessage')}</p>
                <Button onClick={handleUpgrade}>
                  {t('currentSubscription.upgradeButton')}
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
                    {t('buttons.changePlan')}
                  </Button>
                  <Button onClick={handleCancelSubscription} variant="outline" disabled={cancelling}>
                    {cancelling ? t('buttons.cancelling') : t('buttons.cancelSubscription')}
                  </Button>
                </>
              )}
              {subscription.cancel_at_period_end && (
                <Button onClick={handleReactivateSubscription} disabled={reactivating}>
                  {reactivating ? t('buttons.reactivating') : t('buttons.reactivateSubscription')}
                </Button>
              )}
            </CardFooter>
          )}
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usage.title')}</CardTitle>
            <CardDescription>{t('usage.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {usageStats ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('usage.tournaments')}</span>
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
                    <span>{t('usage.autoMatches')}</span>
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
                    <span>{t('usage.recommendations')}</span>
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
                    <span>{t('usage.travelPlans')}</span>
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
                  {t('usage.resetsOn', { date: formatDate(usageStats.period.end.toISOString()) })}
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">{t('usage.noUsageData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('paymentHistory.title')}</CardTitle>
          <CardDescription>{t('paymentHistory.description')}</CardDescription>
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
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
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
            <p className="text-center text-muted-foreground py-8">{t('paymentHistory.noHistory')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}