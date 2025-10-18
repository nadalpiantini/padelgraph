// Sprint 5 Phase 2: Account Billing Page
// User's billing management and subscription details

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
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
import { CancelModal } from '@/components/subscription/CancelModal';
import { ReactivateButton } from '@/components/subscription/ReactivateButton';
import { InvoiceHistory } from '@/components/subscription/InvoiceHistory';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';

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

export default function BillingPage() {
  const t = useTranslations('account.billing');
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadBillingData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth');
        return;
      }

      setUserId(user.id);

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
  }, [supabase, router, toast, t]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  async function handleCancelSubscription() {
    // Open modal instead of browser confirm
    setShowCancelModal(true);
  }

  async function confirmCancellation() {
    if (!subscription || subscription.status !== 'active') return;

    setCancelling(true);
    setShowCancelModal(false);
    
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: t('toasts.subscriptionCancelled.title'),
          description: t('toasts.subscriptionCancelled.message'),
        });
        await loadBillingData();
      } else {
        throw new Error(data.error || 'Cancellation failed');
      }
    } catch (err) {
      toast({
        title: t('toasts.cancellationFailed.title'),
        description: err instanceof Error ? err.message : t('toasts.cancellationFailed.message'),
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  }

  async function handleUpgrade() {
    router.push('/pricing');
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
                <ReactivateButton
                  periodEnd={formatDate(subscription.current_period_end)}
                />
              )}
            </CardFooter>
          )}
        </Card>

        {/* Usage Statistics - Enhanced Component */}
        {userId && subscription && subscription.status === 'active' && (
          <UsageDashboard userId={userId} />
        )}
      </div>

      {/* Invoice History - Enhanced Component */}
      {userId && subscription && subscription.status === 'active' && (
        <InvoiceHistory userId={userId} />
      )}

      {/* Cancel Subscription Modal */}
      {subscription && (
        <CancelModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={confirmCancellation}
          subscriptionPlan={subscription.plan}
          periodEnd={formatDate(subscription.current_period_end)}
          isLoading={cancelling}
        />
      )}
    </div>
  );
}