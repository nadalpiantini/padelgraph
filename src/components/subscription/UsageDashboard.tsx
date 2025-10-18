'use client';

/**
 * Usage Dashboard Component
 * Sprint 5 - FASE 1A: PayPal Production Integration
 *
 * Displays real-time usage vs limits for user's plan:
 * - Progress bars for each resource
 * - Warning states (>80% usage)
 * - Upgrade CTA if limit reached
 * - Refresh capability
 *
 * Created: 2025-10-18
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Trophy,
  Users,
  Calendar,
  Zap,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import { toast } from '@/hooks/use-toast';
import { useRouter } from '@/i18n/routing';

interface UsageData {
  tournaments: { used: number; limit: number };
  matches: { used: number; limit: number };
  teams: { used: number; limit: number };
  bookings: { used: number; limit: number };
  recommendations: { used: number; limit: number };
  auto_matches: { used: number; limit: number };
  plan: string;
  period: { start: string; end: string };
}

interface UsageDashboardProps {
  userId: string;
}

export function UsageDashboard({ userId }: UsageDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsageData();
  }, [userId]);

  async function loadUsageData() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/usage/stats');

      if (!response.ok) {
        throw new Error('Failed to load usage data');
      }

      const data = await response.json();
      setUsage(data);
    } catch (err) {
      console.error('Error loading usage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
      toast({
        title: 'Error',
        description: 'Failed to load usage data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function calculatePercentage(used: number, limit: number): number {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100; // No limit means 100% if used > 0
    return Math.min((used / limit) * 100, 100);
  }

  function getUsageStatus(used: number, limit: number): 'ok' | 'warning' | 'exceeded' {
    if (limit === -1) return 'ok'; // Unlimited
    const percentage = calculatePercentage(used, limit);
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    return 'ok';
  }

  function formatLimit(limit: number): string {
    return limit === -1 ? '∞' : limit.toString();
  }

  function getStatusIcon(status: 'ok' | 'warning' | 'exceeded') {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'exceeded':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  }

  function getProgressColor(status: 'ok' | 'warning' | 'exceeded'): string {
    switch (status) {
      case 'ok':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'exceeded':
        return 'bg-red-500';
    }
  }

  const usageItems = usage
    ? [
        {
          label: 'Tournaments',
          icon: Trophy,
          used: usage.tournaments.used,
          limit: usage.tournaments.limit,
        },
        {
          label: 'Matches',
          icon: Zap,
          used: usage.matches.used,
          limit: usage.matches.limit,
        },
        {
          label: 'Teams',
          icon: Users,
          used: usage.teams.used,
          limit: usage.teams.limit,
        },
        {
          label: 'Bookings',
          icon: Calendar,
          used: usage.bookings.used,
          limit: usage.bookings.limit,
        },
        {
          label: 'Recommendations',
          icon: TrendingUp,
          used: usage.recommendations.used,
          limit: usage.recommendations.limit,
        },
        {
          label: 'Auto-Matches',
          icon: Zap,
          used: usage.auto_matches.used,
          limit: usage.auto_matches.limit,
        },
      ]
    : [];

  const hasExceededLimits = usageItems.some(
    (item) => getUsageStatus(item.used, item.limit) === 'exceeded'
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Dashboard</CardTitle>
          <CardDescription>Loading usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Dashboard</CardTitle>
          <CardDescription>Error loading usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">{error || 'No data available'}</p>
            <Button onClick={loadUsageData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Usage Dashboard</CardTitle>
          <CardDescription>
            Current plan: <Badge variant="default" className="ml-2">{usage.plan.toUpperCase()}</Badge>
          </CardDescription>
        </div>
        <Button onClick={loadUsageData} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Items */}
        <div className="space-y-4">
          {usageItems.map((item) => {
            const status = getUsageStatus(item.used, item.limit);
            const percentage = calculatePercentage(item.used, item.limit);
            const Icon = item.icon;

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {getStatusIcon(status)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.used} / {formatLimit(item.limit)}
                  </span>
                </div>
                <div className="relative w-full h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${getProgressColor(status)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {status === 'warning' && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    You're approaching your limit ({Math.round(percentage)}% used)
                  </p>
                )}
                {status === 'exceeded' && (
                  <p className="text-xs text-red-600 dark:text-red-500">
                    Limit reached. Upgrade to continue using this feature.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Period Info */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Usage period: {formatDate(usage.period.start)} - {formatDate(usage.period.end)}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Resets on {formatDate(usage.period.end)}
          </p>
        </div>

        {/* Upgrade CTA */}
        {hasExceededLimits && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Usage Limit Reached
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  You've reached the limit for some features. Upgrade your plan to continue.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/pricing')}
              variant="default"
              size="sm"
              className="w-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        )}

        {/* Free Plan Info */}
        {usage.plan === 'free' && !hasExceededLimits && (
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Get More with Pro
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Unlock unlimited tournaments, matches, and advanced features.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/pricing')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Plans
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
