// Sprint 5 Phase 2: Admin Subscription Dashboard
// Provides comprehensive subscription management tools for administrators

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Calendar,
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { toast } from '@/hooks/use-toast';

interface SubscriptionData {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  price_amount: number;
  currency: string;
  paypal_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  user_profile: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface DashboardStats {
  total_subscriptions: number;
  active_subscriptions: number;
  monthly_revenue: number;
  churn_rate: number;
  plans_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  recent_changes: Array<{
    user_id: string;
    change_type: string;
    old_plan: string;
    new_plan: string;
    timestamp: string;
  }>;
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  async function checkAdminAndLoadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check admin status
      const { data: profile } = await supabase
        .from('user_profile')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'You must be an admin to access this page',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadSubscriptions();
      await loadStats();
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscriptions() {
    const { data, error } = await supabase
      .from('subscription')
      .select(`
        *,
        user_profile!inner(name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading subscriptions:', error);
      return;
    }

    setSubscriptions(data || []);
  }

  async function loadStats() {
    // Calculate statistics
    const { data: subs } = await supabase
      .from('subscription')
      .select('*');

    if (!subs) return;

    const activeSubs = subs.filter(s => s.status === 'active');
    const monthlyRevenue = activeSubs.reduce((total, s) => total + (s.price_amount || 0), 0);

    const plansDistribution = subs.reduce((acc, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = subs.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate churn rate (simplified)
    const cancelledThisMonth = subs.filter(s =>
      s.status === 'cancelled' &&
      new Date(s.updated_at).getMonth() === new Date().getMonth()
    ).length;
    const churnRate = activeSubs.length > 0 ? (cancelledThisMonth / activeSubs.length) * 100 : 0;

    setStats({
      total_subscriptions: subs.length,
      active_subscriptions: activeSubs.length,
      monthly_revenue: monthlyRevenue,
      churn_rate: churnRate,
      plans_distribution: plansDistribution,
      status_distribution: statusDistribution,
      recent_changes: [], // Would need activity log for this
    });
  }

  async function handleSyncSubscriptions() {
    setSyncing(true);
    try {
      const response = await fetch('/api/cron/sync-subscriptions', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Sync Complete',
          description: 'Subscriptions have been synced with PayPal',
        });
        await loadSubscriptions();
        await loadStats();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync subscriptions',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCancelSubscription(subscriptionId: string) {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          reason: 'Admin cancellation',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Subscription Cancelled',
          description: 'The subscription has been cancelled',
        });
        await loadSubscriptions();
      } else {
        throw new Error('Cancellation failed');
      }
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  }

  async function handleReactivateSubscription(subscriptionId: string) {
    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      });

      if (response.ok) {
        toast({
          title: 'Subscription Reactivated',
          description: 'The subscription has been reactivated',
        });
        await loadSubscriptions();
      } else {
        throw new Error('Reactivation failed');
      }
    } catch (error) {
      toast({
        title: 'Reactivation Failed',
        description: 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    }
  }

  async function exportSubscriptions() {
    const csv = [
      ['User ID', 'Name', 'Email', 'Plan', 'Status', 'Amount', 'Start Date', 'End Date'],
      ...filteredSubscriptions.map(s => [
        s.user_id,
        s.user_profile.name,
        s.user_profile.email,
        s.plan,
        s.status,
        s.price_amount,
        s.current_period_start,
        s.current_period_end,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' ||
      sub.user_profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_profile.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = filterPlan === 'all' || sub.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'past_due':
        return 'warning';
      case 'suspended':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'past_due':
        return <AlertCircle className="h-4 w-4" />;
      case 'suspended':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleSyncSubscriptions} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync with PayPal
          </Button>
          <Button onClick={exportSubscriptions} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <p className="text-2xl font-bold">{stats?.total_subscriptions || 0}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold">{stats?.active_subscriptions || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold">${stats?.monthly_revenue || 0}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
              <p className="text-2xl font-bold">{stats?.churn_rate?.toFixed(1) || 0}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="club">Club</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {subscription.user_profile.avatar_url && (
                      <img
                        src={subscription.user_profile.avatar_url}
                        alt={subscription.user_profile.name}
                        className="h-8 w-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium">{subscription.user_profile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.user_profile.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {subscription.plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(subscription.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(subscription.status)}
                      {subscription.status}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>${subscription.price_amount}/mo</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatDate(subscription.current_period_start)}</p>
                    <p className="text-muted-foreground">
                      to {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {subscription.status === 'active' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelSubscription(subscription.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    {subscription.status === 'cancelled' && subscription.cancel_at_period_end && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleReactivateSubscription(subscription.id)}
                      >
                        Reactivate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/users/${subscription.user_id}`)}
                    >
                      View User
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}