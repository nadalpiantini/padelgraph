/**
 * Admin Analytics Dashboard Page
 * Sprint 5 Phase 4: KPI Dashboard implementation
 */

'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Target,
  AlertCircle,
} from 'lucide-react';

interface BusinessKPIs {
  mrr: number;
  arr: number;
  arpu: number;
  ltv: number;
  churn_rate: number;
  new_users: number;
  active_users: {
    dau: number;
    mau: number;
    wau: number;
  };
  user_growth_rate: number;
  session_duration_avg: number;
  pages_per_session: number;
  bounce_rate: number;
  feature_adoption: Record<string, number>;
  signup_conversion_rate: number;
  trial_to_paid_conversion: number;
  free_to_paid_conversion: number;
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
}

interface CohortData {
  cohort: string;
  size: number;
  day_0: number;
  day_1: number;
  day_7: number;
  day_30: number;
  day_60: number;
  day_90: number;
}

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState<BusinessKPIs | null>(null);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      // Fetch KPIs
      const kpiResponse = await fetch('/api/admin/analytics/kpi');
      if (!kpiResponse.ok) throw new Error('Failed to load KPIs');
      const kpiData = await kpiResponse.json();
      setKpis(kpiData.data);

      // Fetch cohort analysis
      const cohortResponse = await fetch('/api/admin/analytics/cohort');
      if (!cohortResponse.ok) throw new Error('Failed to load cohort data');
      const cohortData = await cohortResponse.json();
      setCohorts(cohortData.data.cohorts);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-slate-800 rounded w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h2 className="font-semibold text-red-500">Error Loading Analytics</h2>
              <p className="text-slate-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!kpis) return null;

  // Prepare retention chart data
  const retentionChartData = cohorts.map((cohort) => ({
    cohort: cohort.cohort,
    'Day 1': cohort.day_1,
    'Day 7': cohort.day_7,
    'Day 30': cohort.day_30,
  }));

  // Prepare feature adoption data
  const featureAdoptionData = Object.entries(kpis.feature_adoption).map(([feature, rate]) => ({
    feature: feature.replace('_', ' '),
    rate,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <p className="text-slate-400 mt-2">Business intelligence and key metrics</p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 bg-slate-900 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {p === '7d' && 'Last 7 Days'}
                {p === '30d' && 'Last 30 Days'}
                {p === '90d' && 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* MRR */}
          <KPICard
            title="Monthly Recurring Revenue"
            value={`€${kpis.mrr.toFixed(2)}`}
            change={kpis.user_growth_rate}
            icon={<DollarSign className="w-6 h-6" />}
            trend="up"
          />

          {/* DAU */}
          <KPICard
            title="Daily Active Users"
            value={kpis.active_users.dau.toString()}
            icon={<Users className="w-6 h-6" />}
            subtitle={`MAU: ${kpis.active_users.mau}`}
          />

          {/* Churn Rate */}
          <KPICard
            title="Churn Rate"
            value={`${kpis.churn_rate.toFixed(2)}%`}
            change={-kpis.churn_rate}
            icon={<TrendingDown className="w-6 h-6" />}
            trend={kpis.churn_rate > 5 ? 'down' : 'neutral'}
          />

          {/* D7 Retention */}
          <KPICard
            title="Day 7 Retention"
            value={`${kpis.day_7_retention.toFixed(1)}%`}
            icon={<Target className="w-6 h-6" />}
            trend={kpis.day_7_retention > 40 ? 'up' : 'neutral'}
          />
        </div>

        {/* Revenue & Growth Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Metrics */}
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Revenue Metrics
            </h2>
            <div className="space-y-4">
              <MetricRow label="MRR" value={`€${kpis.mrr.toFixed(2)}`} />
              <MetricRow label="ARR" value={`€${kpis.arr.toFixed(2)}`} />
              <MetricRow label="ARPU" value={`€${kpis.arpu.toFixed(2)}`} />
              <MetricRow label="LTV" value={`€${kpis.ltv.toFixed(2)}`} />
            </div>
          </div>

          {/* User Growth */}
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              User Growth
            </h2>
            <div className="space-y-4">
              <MetricRow label="New Users" value={kpis.new_users.toString()} />
              <MetricRow label="DAU" value={kpis.active_users.dau.toString()} />
              <MetricRow label="WAU" value={kpis.active_users.wau.toString()} />
              <MetricRow label="MAU" value={kpis.active_users.mau.toString()} />
              <MetricRow
                label="Growth Rate"
                value={`${kpis.user_growth_rate.toFixed(2)}%`}
                trend={kpis.user_growth_rate > 0 ? 'up' : 'down'}
              />
            </div>
          </div>
        </div>

        {/* Retention Chart */}
        <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold mb-6">Cohort Retention Analysis</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="cohort" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="Day 1" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Day 7" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="Day 30" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Adoption */}
        {featureAdoptionData.length > 0 && (
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold mb-6">Feature Adoption Rates</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureAdoptionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="feature" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="rate" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">Session Duration</h3>
            </div>
            <p className="text-3xl font-bold">{Math.floor(kpis.session_duration_avg / 60)}m</p>
            <p className="text-sm text-slate-400 mt-1">Average per session</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Pages per Session</h3>
            </div>
            <p className="text-3xl font-bold">{kpis.pages_per_session.toFixed(1)}</p>
            <p className="text-sm text-slate-400 mt-1">Average page views</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold">Bounce Rate</h3>
            </div>
            <p className="text-3xl font-bold">{kpis.bounce_rate.toFixed(1)}%</p>
            <p className="text-sm text-slate-400 mt-1">Single page sessions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

function KPICard({ title, value, change, icon, trend = 'neutral', subtitle }: KPICardProps) {
  const trendColor =
    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={trendColor}>{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <h3 className="text-sm text-slate-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

// Metric Row Component
interface MetricRowProps {
  label: string;
  value: string;
  trend?: 'up' | 'down';
}

function MetricRow({ label, value, trend }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}</span>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  );
}
