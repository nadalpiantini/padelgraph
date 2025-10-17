/**
 * Alert Service - Business Metrics Monitoring
 * Monitors KPIs and triggers alerts when thresholds are exceeded
 */

import { calculateMRR, calculateChurnRate, calculateDAU } from './kpi-service';

export interface Alert {
  id: string;
  type: 'revenue' | 'churn' | 'performance' | 'engagement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

interface AlertThreshold {
  metric: string;
  threshold: number;
  comparison: 'above' | 'below';
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'revenue' | 'churn' | 'performance' | 'engagement';
  title: string;
  messageTemplate: string;
}

// Alert thresholds configuration
const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    metric: 'churn_rate',
    threshold: 10,
    comparison: 'above',
    severity: 'high',
    type: 'churn',
    title: 'High Churn Rate Detected',
    messageTemplate: 'Churn rate has exceeded 10% threshold: {value}%',
  },
  {
    metric: 'churn_rate',
    threshold: 20,
    comparison: 'above',
    severity: 'critical',
    type: 'churn',
    title: 'Critical Churn Rate',
    messageTemplate: 'CRITICAL: Churn rate is dangerously high: {value}%',
  },
  {
    metric: 'mrr',
    threshold: 100, // €100
    comparison: 'below',
    severity: 'medium',
    type: 'revenue',
    title: 'Low MRR Warning',
    messageTemplate: 'MRR has fallen below €100: €{value}',
  },
  {
    metric: 'dau',
    threshold: 10,
    comparison: 'below',
    severity: 'medium',
    type: 'engagement',
    title: 'Low Daily Active Users',
    messageTemplate: 'DAU has dropped below 10 users: {value} users',
  },
  {
    metric: 'dau',
    threshold: 5,
    comparison: 'below',
    severity: 'high',
    type: 'engagement',
    title: 'Very Low Engagement',
    messageTemplate: 'ALERT: DAU critically low: {value} users',
  },
];

/**
 * Check all metrics and generate alerts if thresholds exceeded
 */
export async function checkMetrics(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Fetch current metrics
  const [mrr, churnRate, dau] = await Promise.all([
    calculateMRR(),
    calculateChurnRate(),
    calculateDAU(),
  ]);

  const metrics = {
    mrr,
    churn_rate: churnRate,
    dau,
  };

  // Check each threshold
  for (const threshold of ALERT_THRESHOLDS) {
    const currentValue = metrics[threshold.metric as keyof typeof metrics];

    if (currentValue === undefined) continue;

    const shouldAlert =
      threshold.comparison === 'above'
        ? currentValue > threshold.threshold
        : currentValue < threshold.threshold;

    if (shouldAlert) {
      alerts.push({
        id: `alert_${threshold.metric}_${Date.now()}`,
        type: threshold.type,
        severity: threshold.severity,
        title: threshold.title,
        message: threshold.messageTemplate.replace('{value}', currentValue.toFixed(2)),
        metric: threshold.metric,
        currentValue,
        threshold: threshold.threshold,
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Get active alerts (currently triggered)
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  return await checkMetrics();
}

/**
 * Send alert notification (email/Slack - stub for now)
 */
export async function sendAlertNotification(alert: Alert): Promise<void> {
  console.log('[Alert Service] Alert triggered:', alert);

  // TODO: Implement email notification via Resend
  // TODO: Implement Slack notification (optional)

  // For now, just log
  if (alert.severity === 'critical') {
    console.error('[CRITICAL ALERT]', alert.title, '-', alert.message);
  } else if (alert.severity === 'high') {
    console.warn('[HIGH ALERT]', alert.title, '-', alert.message);
  } else {
    console.info('[ALERT]', alert.title, '-', alert.message);
  }
}

/**
 * Check metrics and send notifications if needed
 */
export async function runAlertCheck(): Promise<Alert[]> {
  const alerts = await checkMetrics();

  // Send notifications for each alert
  for (const alert of alerts) {
    await sendAlertNotification(alert);
  }

  return alerts;
}
